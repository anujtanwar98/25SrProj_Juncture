import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
import { ExpandableCalendar, TimelineList, CalendarProvider } from 'react-native-calendars';
import { collection, onSnapshot, doc } from 'firebase/firestore';
import { db, auth } from '../auth/firebase';
import { DateTime } from 'luxon';

const INITIAL_DATE = DateTime.now().toFormat('yyyy-MM-dd');
const SCREEN_HEIGHT = Dimensions.get('window').height;
const CALENDAR_CLOSED_HEIGHT = 105;

const CombinedCalendar = () => {
  const [selectedDate, setSelectedDate] = useState(INITIAL_DATE);
  const [isMonthView, setIsMonthView] = useState(true);
  const [loading, setLoading] = useState(true);
  const [firebaseEvents, setFirebaseEvents] = useState({});
  const [markedDates, setMarkedDates] = useState({});
  const [timelineHeight, setTimelineHeight] = useState(SCREEN_HEIGHT - CALENDAR_CLOSED_HEIGHT);

  // Firebase data fetching
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
          console.log('No user logged in');
          setLoading(false);
          return;
        }

        const userEventRef = doc(db, 'calendar_events', currentUser.uid);
        
        const unsubscribe = onSnapshot(userEventRef, 
          (docSnapshot) => {
            if (docSnapshot.exists()) {
              const eventsData = docSnapshot.data().events;
              const formattedEvents = {};
              const marked = {};
              
              if (Array.isArray(eventsData)) {
                eventsData.forEach(event => {
                  // Format event date
                  let eventDate;
                  const when = event.when;
                  
                  if (when.all_day || when.object === 'date' || when.start_date) {
                    eventDate = when.start_date || 
                              DateTime.fromSeconds(when.start_time).toFormat('yyyy-MM-dd');
                  } else {
                    eventDate = DateTime.fromSeconds(when.start_time)
                      .setZone(when.start_timezone || 'local')
                      .toFormat('yyyy-MM-dd');
                  }

                  // Format event for timeline
                  const formattedEvent = {
                    start: when.start_time ? 
                      DateTime.fromSeconds(when.start_time).toFormat("yyyy-MM-dd HH:mm:ss") :
                      `${eventDate} 00:00:00`,
                    end: when.end_time ?
                      DateTime.fromSeconds(when.end_time).toFormat("yyyy-MM-dd HH:mm:ss") :
                      `${eventDate} 23:59:59`,
                    title: event.title,
                    summary: formatEventTime(when),
                    color: '#50cebb',
                    participants: event.participants || []
                  };

                  // Group events by date
                  if (!formattedEvents[eventDate]) {
                    formattedEvents[eventDate] = [];
                  }
                  formattedEvents[eventDate].push(formattedEvent);

                  // Mark dates with events
                  marked[eventDate] = { marked: true };
                });
              }
              
              setFirebaseEvents(formattedEvents);
              setMarkedDates(marked);
            }
            setLoading(false);
          },
          (error) => {
            console.error('Error fetching events: ', error);
            setLoading(false);
          }
        );

        return () => unsubscribe();
      } catch (error) {
        console.error('Error setting up events listener: ', error);
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  const formatEventTime = (when) => {
    if (!when) return 'Invalid Time';
    if (when.all_day || when.object === 'date' || when.start_date) {
      return 'All day';
    }
    try {
      let startTime = DateTime.fromSeconds(when.start_time)
        .setZone(when.start_timezone || 'local');
      let endTime = DateTime.fromSeconds(when.end_time)
        .setZone(when.end_timezone || 'local');
      
      return `${startTime.toFormat('h:mm a')} - ${endTime.toFormat('h:mm a')}`;
    } catch (error) {
      console.error('Time formatting error:', error);
      return 'Time Error';
    }
  };

  useEffect(() => {
    if (!isMonthView) {
      setTimelineHeight(SCREEN_HEIGHT - CALENDAR_CLOSED_HEIGHT);
    }
  }, [isMonthView]);

  const renderEvent = (event) => {
    return (
      <TouchableOpacity 
        style={[styles.item, { backgroundColor: event.color }]}
        onPress={() => console.log('Event pressed:', event)}
      >
        <View>
          <Text style={styles.title}>{event.title}</Text>
          <Text style={styles.time}>{event.summary}</Text>
          {event.participants?.map((participant, index) => (
            <View key={index} style={styles.participantRow}>
              <Text style={styles.participantEmail}>
                • {participant.email}
              </Text>
              <Text style={[
                styles.participantStatus,
                {
                  color: participant.status === 'yes' 
                    ? '#4CAF50'
                    : participant.status === 'no' 
                      ? '#F44336'
                      : participant.status === 'maybe'
                        ? '#FFA000'
                        : '#666',
                  backgroundColor: participant.status === 'yes'
                    ? '#E8F5E9'
                    : participant.status === 'no'
                      ? '#FFEBEE'
                      : participant.status === 'maybe'
                        ? '#FFF3E0'
                        : '#f1f3f4',
                }
              ]}>
                {participant.status === 'yes' ? '✓ Going' : 
                 participant.status === 'no' ? '✗ Not Going' : 
                 participant.status === 'maybe' ? '? Maybe' : 'Invited'}
              </Text>
            </View>
          ))}
        </View>
      </TouchableOpacity>
    );
  };

  const onDayPress = (day) => {
    setSelectedDate(day.dateString);
    setIsMonthView(false);
    setTimelineHeight(SCREEN_HEIGHT - CALENDAR_CLOSED_HEIGHT);
  };

  const onCalendarToggled = (isOpen) => {
    setIsMonthView(isOpen);
    if (!isOpen) {
      setTimelineHeight(SCREEN_HEIGHT - CALENDAR_CLOSED_HEIGHT);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CalendarProvider 
        date={selectedDate}
        onDateChanged={date => setSelectedDate(date)}
        style={styles.calendarProvider}
      >
        <ExpandableCalendar
          firstDay={1}
          markedDates={markedDates}
          onDayPress={onDayPress}
          onCalendarToggled={onCalendarToggled}
          hideKnob={false}
          disableAllTouchEventsForDisabledDays
          theme={{
            selectedDayBackgroundColor: '#4CAF50',
            dotColor: '#4CAF50',
            todayTextColor: '#4CAF50',
          }}
        />
          <View style={[styles.timelineContainer, { height: timelineHeight }]}>
            <TimelineList
              events={firebaseEvents}
              renderEvent={renderEvent}
              showNowIndicator
              scrollToFirst
              initialTime={{ hour: 8, minutes: 0 }}
              format24h={false}
              onBackgroundLongPress={() => console.log('onBackgroundLongPress')}
              onBackgroundLongPressOut={() => console.log('onBackgroundLongPressOut')}
              start={1}
              end={24}
              overlapEventsSpacing={8}
              rightEdgeSpacing={24}
              style={styles.timeline}
            />
          </View>
      </CalendarProvider>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  calendarProvider: {
    flex: 1,
  },
  timelineContainer: {
    backgroundColor: 'white',
  },
  timeline: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  item: {
    backgroundColor: '#50cebb',
    borderRadius: 5,
    padding: 10,
    marginRight: 10,
    marginLeft: 10,
    marginVertical: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  title: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  time: {
    color: 'white',
    fontSize: 14,
    marginTop: 4,
  },
  participantRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  participantEmail: {
    fontSize: 12,
    color: 'white',
    flex: 1,
    marginRight: 8,
  },
  participantStatus: {
    fontSize: 11,
    fontWeight: '500',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  }
});

export default CombinedCalendar;