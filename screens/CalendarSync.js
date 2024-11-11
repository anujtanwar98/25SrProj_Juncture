import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../auth/firebase';
import { getFirestore, doc, setDoc, collection, addDoc } from 'firebase/firestore';
import { initializeApp } from "firebase/app";

const API_BASE_URL = 'https://two5srproj-server.onrender.com';

// Initialize Firestore
const db = getFirestore();

export default function CalendarSync() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncStatus, setSyncStatus] = useState('');
    const [error, setError] = useState(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      if (!user) {
        setError('Please login first');
        return;
      }
      checkAuthStatus();
    });

    const subscription = Linking.addEventListener('url', handleDeepLink);
    
    return () => {
      unsubscribe();
      subscription.remove();
    };
  }, []);

  const checkAuthStatus = async () => {
    try {
      const grantId = await AsyncStorage.getItem('nylasGrantId');
      if (grantId) {
        setIsAuthenticated(true);
        console.log('Existing grant ID found');
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      setError('Failed to check authentication status');
    }
  };

  const handleDeepLink = async (event) => {
    if (!auth.currentUser) {
      setError('Please login first');
      return;
    }

    try {
      console.log('Deep link received:', event.url);
      const data = Linking.parse(event.url);
      if (data.path === 'exchange') {
        const response = await fetch(`${API_BASE_URL}/oauth/exchange?code=${data.queryParams.code}`);
        if (response.ok) {
          const grantId = await response.text();
          await AsyncStorage.setItem('nylasGrantId', grantId);
          setIsAuthenticated(true);
          await syncCalendarData();
        } else {
          throw new Error('Failed to exchange code');
        }
      }
    } catch (error) {
      console.error('Error in handleDeepLink:', error);
      setError('Authentication failed');
    }
  };

  const startAuth = async () => {
    if (!auth.currentUser) {
      setError('Please login first');
      return;
    }

    try {
      setError(null);
      const authUrl = `${API_BASE_URL}/nylas/auth`;
      const result = await WebBrowser.openAuthSessionAsync(authUrl, 'myapp://oauth/exchange');
      if (result.type === 'success') {
        await handleDeepLink({ url: result.url });
      } else {
        setError('Authentication was cancelled');
      }
    } catch (error) {
      console.error('Error in startAuth:', error);
      setError('Failed to start authentication');
    }
  };

  const saveEventsToFirestore = async (events, calendarId) => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('No authenticated user');
    }

    try {
      // Reference to the user's calendar events document using their UID
      const userEventsRef = doc(db, 'calendar_events', currentUser.uid);
      
      // Create the calendar events document with all events
      await setDoc(userEventsRef, {
        events: events,  // Array of all calendar events
        syncedAt: new Date().toISOString(),
        calendarId: calendarId,
        userId: currentUser.uid
      });

      setSyncStatus(`Saved ${events.length} events successfully`);

      // Update user's metadata
      await setDoc(doc(db, 'users', currentUser.uid), {
        lastCalendarSync: new Date().toISOString(),
        calendarId: calendarId,
        totalEvents: events.length,
        updatedAt: new Date().toISOString()
      }, { merge: true });

    } catch (error) {
      console.error('Error saving to Firestore:', error);
      throw error;
    }
  };

  const syncCalendarData = async () => {
    if (!auth.currentUser) {
      setError('Please login first');
      return;
    }

    try {
      setIsSyncing(true);
      setSyncStatus('Fetching primary calendar...');

      const calendarResponse = await fetch(`${API_BASE_URL}/nylas/primary-calendar`, {
        method: 'GET',
      });

      if (!calendarResponse.ok) {
        throw new Error('Failed to fetch primary calendar');
      }

      const calendarId = await calendarResponse.text();
      setSyncStatus('Fetching events...');

      const eventsResponse = await fetch(`${API_BASE_URL}/nylas/list-events`, {
        method: 'GET',
      });

      if (!eventsResponse.ok) {
        throw new Error('Failed to fetch events');
      }

      const events = await eventsResponse.json();
      setSyncStatus(`Starting to save ${events.length} events...`);

      await saveEventsToFirestore(events, calendarId);
      
      setSyncStatus('Sync completed successfully!');
      setTimeout(() => setSyncStatus(''), 3000);
    } catch (error) {
      console.error('Error in syncCalendarData:', error);
      setError(`Sync failed: ${error.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('nylasGrantId');
      setIsAuthenticated(false);
      setSyncStatus('');
      setError(null);
    } catch (error) {
      console.error('Error during logout:', error);
      setError('Logout failed');
    }
  };

  // If no user is logged in, show login message
  if (!auth.currentUser) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Please login to sync your calendar</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Calendar Sync</Text>
      
      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}

      {syncStatus ? (
        <Text style={styles.statusText}>{syncStatus}</Text>
      ) : null}

      {!isAuthenticated ? (
        <TouchableOpacity
          style={styles.button}
          onPress={startAuth}
          disabled={isSyncing}>
          <Text style={styles.buttonText}>Connect Calendar</Text>
        </TouchableOpacity>
      ) : (
        <View>
          <TouchableOpacity
            style={[styles.button, isSyncing && styles.disabledButton]}
            onPress={syncCalendarData}
            disabled={isSyncing}>
            {isSyncing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Sync Calendar</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.logoutButton]}
            onPress={logout}
            disabled={isSyncing}>
            <Text style={[styles.buttonText, styles.logoutText]}>Logout</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
      backgroundColor: '#fff',
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      marginBottom: 30,
      color: '#2E66E7',
    },
    button: {
      backgroundColor: '#2E66E7',
      paddingHorizontal: 30,
      paddingVertical: 15,
      borderRadius: 25,
      minWidth: 200,
      alignItems: 'center',
      marginVertical: 10,
    },
    buttonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
    disabledButton: {
      opacity: 0.7,
    },
    logoutButton: {
      backgroundColor: '#f1f3f4',
    },
    logoutText: {
      color: '#666',
    },
    statusText: {
      marginVertical: 20,
      fontSize: 16,
      color: '#2E66E7',
      textAlign: 'center',
    },
    errorText: {
      marginVertical: 20,
      fontSize: 16,
      color: '#dc3545',
      textAlign: 'center',
    }
});