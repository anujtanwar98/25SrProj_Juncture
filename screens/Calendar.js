import React, { useState, useEffect, useCallback } from 'react';
import { View, Button, Text, Platform, FlatList, StyleSheet, SafeAreaView, ActivityIndicator, TouchableOpacity } from 'react-native';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = Platform.select({
  ios: 'https://two5srproj-server.onrender.com',
  default: 'https://two5srproj-server.onrender.com',
});

export default function Calendar() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authKey, setAuthKey] = useState(0);
  const [primaryCalendarId, setPrimaryCalendarId] = useState(null);
  const [events, setEvents] = useState([]);
  const [lastSyncToken, setLastSyncToken] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

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
      console.log('Received events data:', data);

      if (Array.isArray(data)) {
        // Initial fetch or full event list
        setEvents(data);
      } else if (data.events && Array.isArray(data.events)) {
        // Delta update
        setEvents(prevEvents => {
          const updatedEvents = [...prevEvents];
          data.events.forEach(newEvent => {
            const index = updatedEvents.findIndex(e => e.id === newEvent.id);
            if (index !== -1) {
              if (newEvent.deleted) {
                // Remove deleted event
                updatedEvents.splice(index, 1);
              } else {
                // Update existing event
                updatedEvents[index] = newEvent;
              }
            } else if (!newEvent.deleted) {
              // Add new event
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

  const formatEventTime = (timestamp) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatEventDate = (timestamp) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const renderEventItem = ({ item }) => (
    <TouchableOpacity style={styles.eventCard}>
      <View style={styles.eventTimeContainer}>
        <Text style={styles.eventTime}>{formatEventTime(item.when.start_time)}</Text>
        <Text style={styles.eventDate}>{formatEventDate(item.when.start_time)}</Text>
      </View>
      <View style={styles.eventDetails}>
        <Text style={styles.eventTitle} numberOfLines={1}>
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
      <Text style={styles.emptyText}>No upcoming events</Text>
      <Text style={styles.emptySubtext}>Take a break and relax! 🌴</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {isAuthenticated ? (
        <>
          {renderHeader()}
          <FlatList
            data={events}
            renderItem={renderEventItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.eventsList}
            showsVerticalScrollIndicator={false}
            refreshing={refreshing}
            onRefresh={fetchEvents}
            ListEmptyComponent={renderEmpty()}
            ListHeaderComponent={
              <View style={styles.refreshHeader}>
                <Text style={styles.lastSync}>
                  Last synced: {new Date().toLocaleTimeString()}
                </Text>
              </View>
            }
          />
        </>
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a73e8',
  },
  eventsList: {
    padding: 15,
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
    color: '#1a73e8',
  },
  eventDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
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
  emptyContainer: {
    alignItems: 'center',
    marginTop: 50,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#999',
  },
  refreshHeader: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  lastSync: {
    fontSize: 12,
    color: '#999',
  },
});
