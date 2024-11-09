import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Text, SafeAreaView, FlatList, TouchableOpacity, ScrollView } from 'react-native';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Calendar } from 'react-native-calendars';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

const API_BASE_URL = 'https://two5srproj-server.onrender.com';

export default function CalendarUi() {
  const [selected, setSelected] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authKey, setAuthKey] = useState(0);
  const [primaryCalendarId, setPrimaryCalendarId] = useState(null);
  const [events, setEvents] = useState([]);
  const [lastSyncToken, setLastSyncToken] = useState(null);
  const [eventsForSelectedDate, setEventsForSelectedDate] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    checkAuthStatus();
    const subscription = Linking.addEventListener('url', handleDeepLink);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchPrimaryCalendar();
      fetchEvents();

      // Set up polling for event updates
      const intervalId = setInterval(fetchEvents, 3000); // Poll every 3 seconds

      return () => clearInterval(intervalId);
    }
  }, [isAuthenticated]);

  const handleAuthentication = (value) => {
    setIsAuthenticated(value);
    setAuthKey(prevKey => prevKey + 1);
  };

  const checkAuthStatus = async () => {
    try {
      const grantId = await AsyncStorage.getItem('nylasGrantId');
      if (grantId) {
        handleAuthentication(true);
        console.log('Existing grant ID found, setting authenticated to true');
      } else {
        console.log('No existing grant ID found');
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
    }
  };

  const handleDeepLink = async (event) => {
    try {
      console.log('Deep link received:', event.url);
      const data = Linking.parse(event.url);
      console.log('Parsed data:', data);
      if (data.path === 'exchange') {
        console.log('Auth path detected');
        const response = await fetch(`${API_BASE_URL}/oauth/exchange?code=${data.queryParams.code}`);
        if (response.ok) {
          const grantId = await response.text();
          await AsyncStorage.setItem('nylasGrantId', grantId);
          handleAuthentication(true);
          console.log('Authentication state set to true');
        } else {
          console.error('Error exchanging code for grant ID');
        }
      }
    } catch (error) {
      console.error('Error in handleDeepLink:', error);
    }
  };

  const startAuth = async () => {
    try {
      const authUrl = `${API_BASE_URL}/nylas/auth`;
      console.log('Opening auth URL:', authUrl);
      const result = await WebBrowser.openAuthSessionAsync(authUrl, 'myapp://oauth/exchange');
      console.log('WebBrowser result:', result);
      if (result.type === 'success') {
        await handleDeepLink({ url: result.url });
      } else {
        console.log('Auth was cancelled or failed');
      }
    } catch (error) {
      console.error('Error in startAuth:', error);
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('nylasGrantId');
      handleAuthentication(false);
      setEvents([]);
      setLastSyncToken(null);
      console.log('Logged out successfully');
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  const fetchPrimaryCalendar = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/nylas/primary-calendar`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const calendarId = await response.text();
      setPrimaryCalendarId(calendarId);
      console.log('Primary Calendar ID:', calendarId);
    } catch (error) {
      console.error('Error fetching primary calendar:', error);
    }
  };

  useEffect(() => {
    if (selected) {
      const dateEvents = events.filter(event => {
        if (!event.when) return false;
        try {
          let eventDate;
          if (event.when.start_date) {
            // Handle all-day events
            eventDate = event.when.start_date;
          } else if (event.when.start_time) {
            // Handle time-based events
            if (typeof event.when.start_time === 'number') {
              // Convert Unix timestamp (seconds) to milliseconds
              eventDate = new Date(event.when.start_time * 1000).toISOString().split('T')[0];
            } else {
              // Handle string date format
              eventDate = new Date(event.when.start_time).toISOString().split('T')[0];
            }
          } else {
            return false;
          }
          return eventDate === selected;
        } catch (error) {
          console.error('Error processing event date:', error);
          return false;
        }
      });
      setEventsForSelectedDate(dateEvents);
    }
  }, [selected, events]);

  const fetchEvents = useCallback(async () => {
    try {
      const url = new URL(`${API_BASE_URL}/nylas/list-events`);
      if (lastSyncToken) {
        url.searchParams.append('sync_token', lastSyncToken);
      }

      const response = await fetch(url, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();

      if (Array.isArray(data)) {
        setEvents(data);
      } else if (data.events && Array.isArray(data.events)) {
        setEvents(prevEvents => {
          const updatedEvents = [...prevEvents];
          data.events.forEach(newEvent => {
            const index = updatedEvents.findIndex(e => e.id === newEvent.id);
            if (index !== -1) {
              if (newEvent.deleted) {
                updatedEvents.splice(index, 1);
              } else {
                updatedEvents[index] = newEvent;
              }
            } else if (!newEvent.deleted) {
              updatedEvents.push(newEvent);
            }
          });
          return updatedEvents;
        });
      }

      if (data.sync_token) {
        setLastSyncToken(data.sync_token);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  }, [lastSyncToken]);

  const formatEventTime = (when) => {
    if (!when) return 'Invalid Time';
    if (when.all_day || when.object === 'date' || when.start_date) {
      return 'All day';
    }
    try {
      if (typeof when.start_time === 'number') {
        const date = new Date(when.start_time * 1000);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } else if (typeof when.start_time === 'string') {
        const date = new Date(when.start_time);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      return 'Invalid Time Format';
    } catch (error) {
      return 'Time Error';
    }
  };

  const getMarkedDates = () => {
    const marked = {};
    events.forEach(event => {
      if (event.when) {
        let date;
        if (event.when.start_date) {
          date = new Date(event.when.start_date);
        } else if (event.when.start_time) {
          date = new Date(typeof event.when.start_time === 'number' ? 
            event.when.start_time * 1000 : event.when.start_time);
        }
        
        if (date) {
          const dateString = date.toISOString().split('T')[0];
          marked[dateString] = {
            marked: true,
            dotColor: '#2E66E7'
          };
          
          if (dateString === selected) {
            marked[dateString] = {
              ...marked[dateString],
              selected: true,
              selectedColor: '#2E66E7',
              selectedTextColor: 'white'
            };
          }
        }
      }
    });
    return marked;
  };

  const renderEventItem = ({ item }) => {
    return (
      <TouchableOpacity style={styles.eventCard}>
        <View style={styles.eventTimeContainer}>
          <Text style={[styles.eventTime, item.when?.all_day && styles.allDayEventTime]}>
            {formatEventTime(item.when)}
          </Text>
        </View>
        <View style={styles.eventDetails}>
          <Text style={styles.eventTitle}>
            {item.title || 'Untitled Event'}
          </Text>
          {item.location && (
            <Text style={styles.eventLocation} numberOfLines={1}>
              📍 {item.location}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const onDayPress = (day) => {
    setSelected(day.dateString);
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>My Calendar</Text>
      <TouchableOpacity
        style={styles.logoutButton}
        onPress={logout}>
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>No events for this date</Text>
      <Text style={styles.emptySubtext}>Enjoy your free time! 🌴</Text>
    </View>
  );

  const renderCalendarWithEvents = () => (
    <View style={styles.mainContainer}>
      {renderHeader()}
      <ScrollView
        stickyHeaderIndices={[0]}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.calendarWrapper}>
          <Calendar
            onDayPress={onDayPress}
            enableSwipeMonths={true}
            markedDates={getMarkedDates()}
            theme={{
              backgroundColor: '#ffffff',
              calendarBackground: '#ffffff',
              textSectionTitleColor: '#b6c1cd',
              selectedDayBackgroundColor: '#2E66E7',
              selectedDayTextColor: '#ffffff',
              todayTextColor: '#2E66E7',
              dayTextColor: '#2d4150',
              textDisabledColor: '#d9e1e8',
              arrowColor: '#2E66E7',
              monthTextColor: '#2d4150',
            }}
          />
        </View>

        <View style={styles.eventsSection}>
          {eventsForSelectedDate.length > 0 ? (
            eventsForSelectedDate.map(item => (
              <View key={item.id}>
                {renderEventItem({ item })}
              </View>
            ))
          ) : (
            renderEmpty()
          )}
        </View>
      </ScrollView>
    </View>
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <SafeAreaView style={styles.container}>
      {isAuthenticated ? (
        renderCalendarWithEvents()
      ) : (
        <View style={styles.authContainer}>
          <Text style={styles.welcomeText}>Welcome to Juncture</Text>
          <Text style={styles.subtitleText}>Connect your calendar to get started</Text>
          <TouchableOpacity
            style={styles.authButton}
            onPress={startAuth}
            disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.authButtonText}>Connect Calendar</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  mainContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
  },
  calendarWrapper: {
    backgroundColor: '#fff',
    zIndex: 1,
  },
  eventsSection: {
    padding: 20,
  },
  calendarContainer: {
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#2E66E7',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E66E7',
  },
  eventsList: {
    paddingTop: 20,
  },
  eventCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  eventTimeContainer: {
    marginRight: 15,
    alignItems: 'center',
    minWidth: 60,
  },
  eventTime: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E66E7',
  },
  allDayEventTime: {
    color: '#4CAF50',
  },
  eventDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  eventLocation: {
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 30,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
  },

  authContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a73e8',
    marginBottom: 10,
  },
  subtitleText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
  },
  authButton: {
    backgroundColor: '#1a73e8',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    minWidth: 200,
    alignItems: 'center',
  },
  authButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f1f3f4',
  },
  logoutButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
});