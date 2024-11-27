import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { collection, query, where, getDocs, getDoc, doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../auth/firebase';
import { DateTime } from 'luxon';

const formatEventTime = (when) => {
  if (!when) return 'Invalid Time';
  if (when.all_day || when.object === 'date' || when.start_date) {
  return 'All day';
  }
  try {
  let startTime, endTime;
  
  if (typeof when.start_time === 'number') {
      startTime = DateTime.fromSeconds(when.start_time)
      .setZone(when.start_timezone || 'local');
      endTime = DateTime.fromSeconds(when.end_time)
      .setZone(when.end_timezone || 'local');
  } else if (typeof when.start_time === 'string') {
      startTime = DateTime.fromISO(when.start_time)
      .setZone(when.start_timezone || 'local');
      endTime = DateTime.fromISO(when.end_time)
      .setZone(when.end_timezone || 'local');
  }

  return `${startTime.toFormat('h:mm a')} - ${endTime.toFormat('h:mm a')}`;
  } catch (error) {
  console.error('Time formatting error:', error);
  return 'Time Error';
  }
};

const formatEventDate = (when) => {
  if (!when) return 'Invalid Date';
  
  try {
      // Handle all-day events
      if (when.all_day || when.object === 'date' || when.start_date) {
          let startDate;
          
          if (when.start_date) {
              startDate = DateTime.fromISO(when.start_date);
          } else if (typeof when.start_time === 'number') {
              startDate = DateTime.fromSeconds(when.start_time)
                  .setZone(when.start_timezone || 'local');
          } else if (typeof when.start_time === 'string') {
              startDate = DateTime.fromISO(when.start_time)
                  .setZone(when.start_timezone || 'local');
          }

          // If there's an end_date and it's different from start_date
          if (when.end_date && when.end_date !== when.start_date) {
              let endDate;
              if (typeof when.end_date === 'string') {
                  endDate = DateTime.fromISO(when.end_date);
              } else if (typeof when.end_time === 'number') {
                  endDate = DateTime.fromSeconds(when.end_time)
                      .setZone(when.end_timezone || 'local');
              }
              
              // If dates are in same month
              if (startDate.hasSame(endDate, 'month')) {
                  return `${startDate.toFormat('MMM d')} - ${endDate.toFormat('d, yyyy')}`;
              }
              // If dates are in same year
              if (startDate.hasSame(endDate, 'year')) {
                  return `${startDate.toFormat('MMM d')} - ${endDate.toFormat('MMM d, yyyy')}`;
              }
              // Different years
              return `${startDate.toFormat('MMM d, yyyy')} - ${endDate.toFormat('MMM d, yyyy')}`;
          }
          
          // Single day event
          return startDate.toFormat('MMMM d, yyyy');
      }

      // Handle timed events
      let startTime, endTime;
      
      if (typeof when.start_time === 'number') {
          startTime = DateTime.fromSeconds(when.start_time)
              .setZone(when.start_timezone || 'local');
          endTime = DateTime.fromSeconds(when.end_time)
              .setZone(when.end_timezone || 'local');
      } else if (typeof when.start_time === 'string') {
          startTime = DateTime.fromISO(when.start_time)
              .setZone(when.start_timezone || 'local');
          endTime = DateTime.fromISO(when.end_time)
              .setZone(when.end_timezone || 'local');
      }

      // If start and end are on different days
      if (!startTime.hasSame(endTime, 'day')) {
          // If in same month
          if (startTime.hasSame(endTime, 'month')) {
              return `${startTime.toFormat('MMM d')} - ${endTime.toFormat('d, yyyy')}`;
          }
          // If in same year
          if (startTime.hasSame(endTime, 'year')) {
              return `${startTime.toFormat('MMM d')} - ${endTime.toFormat('MMM d, yyyy')}`;
          }
          // Different years
          return `${startTime.toFormat('MMM d, yyyy')} - ${endTime.toFormat('MMM d, yyyy')}`;
      }

      // Same day event
      return startTime.toFormat('MMMM d, yyyy');
      
  } catch (error) {
      console.error('Date formatting error:', error);
      return 'Date Error';
  }
};

const SharedCalendarsViewer = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [sharedWithMe, setSharedWithMe] = useState([]);
  const [sharedCalendarData, setSharedCalendarData] = useState({});

  useEffect(() => {
    let unsubscribeUser = null;
    let calendarUnsubscribes = [];

    const setupRealTimeListeners = async () => {
      try {
        // Listen to changes in the current user's document
        const userRef = doc(db, 'users', auth.currentUser.uid);
        unsubscribeUser = onSnapshot(userRef, async (userDoc) => {
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const sharedWithMeEmails = userData.sharedWithMe || [];
            setSharedWithMe(sharedWithMeEmails);

            // Clean up previous calendar listeners
            calendarUnsubscribes.forEach(unsubscribe => unsubscribe());
            calendarUnsubscribes = [];

            // Set up listeners for each shared calendar
            const sharedData = {};
            for (const email of sharedWithMeEmails) {
              const usersRef = collection(db, 'users');
              const q = query(usersRef, where('email', '==', email));
              const querySnapshot = await getDocs(q);
              
              if (!querySnapshot.empty) {
                const userId = querySnapshot.docs[0].id;
                const calendarRef = doc(db, 'calendar_events', userId);
                
                // Create listener for this calendar
                const unsubscribeCalendar = onSnapshot(calendarRef, (calendarDoc) => {
                  if (calendarDoc.exists()) {
                    const data = calendarDoc.data();
                    sharedData[email] = {
                      events: data.events || [],
                      calendarId: data.calendarId,
                      ownerEmail: email
                    };
                    setSharedCalendarData({...sharedData});
                  }
                });
                
                calendarUnsubscribes.push(unsubscribeCalendar);
              }
            }
          }
          setIsLoading(false);
        });
      } catch (error) {
        console.error('Error setting up real-time listeners:', error);
        setIsLoading(false);
      }
    };

    setupRealTimeListeners();
    
    return () => {
      if (unsubscribeUser) {
        unsubscribeUser();
      }
      calendarUnsubscribes.forEach(unsubscribe => unsubscribe());
    };
  }, []);

  const renderCalendarEvents = (events, ownerEmail) => {
    if (!events || events.length === 0) {
      return <Text style={styles.emptyText}>No events in this calendar</Text>;
    }

    return events.map((event, index) => (
      <View key={index} style={styles.eventItem}>
        <Text style={styles.eventTitle}>{event.title || event.summary}</Text>
        <Text style={styles.eventTime}>
          {formatEventDate(event.when)}
        </Text>
        <Text style={styles.eventTime}>
          {formatEventTime(event.when)}
        </Text>
        <Text style={styles.eventOwner}>Shared by: {ownerEmail}</Text>
      </View>
    ));
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2E66E7" />
        <Text style={styles.loadingText}>Loading shared calendars...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Shared Calendars</Text>
      <ScrollView>
        {sharedWithMe.length === 0 ? (
          <Text style={styles.emptyText}>No calendars shared with you</Text>
        ) : (
          sharedWithMe.map((email) => (
            <View key={email} style={styles.shareItem}>
              <Text style={styles.shareEmail}>{email}'s Calendar</Text>
              {sharedCalendarData[email] && (
                <View style={styles.eventsContainer}>
                  {renderCalendarEvents(sharedCalendarData[email].events, email)}
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#2E66E7',
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
    marginTop: 8,
  },
  shareItem: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#2E66E7',
  },
  shareEmail: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  eventsContainer: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 12,
  },
  eventItem: {
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 6,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 4,
  },
  eventTime: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
  },
  eventOwner: {
    fontSize: 12,
    color: '#888',
  },
});

export default SharedCalendarsViewer;