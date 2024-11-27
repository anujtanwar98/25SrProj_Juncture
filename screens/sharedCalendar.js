import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, ActivityIndicator } from 'react-native';
import { collection, query, where, getDocs, updateDoc, getDoc, doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../auth/firebase';

const CalendarSharingComponent = () => {
  const [recipientEmail, setRecipientEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sharedWithMe, setSharedWithMe] = useState([]);
  const [sharedWithOthers, setSharedWithOthers] = useState([]);

  const shareCalendar = async () => {
    if (!recipientEmail) {
      Alert.alert('Error', 'Please enter recipient email');
      return;
    }

    setIsLoading(true);
    try {
      // 1. Find the recipient user by email
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', recipientEmail));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        Alert.alert('Error', 'User not found');
        setIsLoading(false);
        return;
      }

      const recipientUser = querySnapshot.docs[0].data();
      const recipientId = querySnapshot.docs[0].id;

      // 2. Update current user's document with sharedWithOthers
      const currentUserRef = doc(db, 'users', auth.currentUser.uid);
      const currentUserDoc = await getDoc(currentUserRef);
      const currentUserData = currentUserDoc.data();

      const sharedWithOthers = currentUserData.sharedWithOthers || [];
      if (sharedWithOthers.includes(recipientEmail)) {
        Alert.alert('Info', 'Calendar already shared with this user');
        setIsLoading(false);
        return;
      }

      // 3. Update calendar_events with sharing metadata
      const calendarEventsRef = doc(db, 'calendar_events', auth.currentUser.uid);
      await updateDoc(calendarEventsRef, {
        sharedWith: [...(currentUserData.sharedWithOthers || []), recipientEmail],
        lastUpdated: new Date().toISOString(),
      });

      // 4. Update both users' documents
      // Update sharer's document
      await updateDoc(currentUserRef, {
        sharedWithOthers: [...sharedWithOthers, recipientEmail],
        lastUpdated: new Date().toISOString()
      });

      // Update recipient's document
      const recipientRef = doc(db, 'users', recipientId);
      const recipientDoc = await getDoc(recipientRef);
      const sharedWithMe = recipientDoc.data().sharedWithMe || [];
      await updateDoc(recipientRef, {
        sharedWithMe: [...sharedWithMe, auth.currentUser.email],
        lastUpdated: new Date().toISOString()
      });

      Alert.alert('Success', 'Calendar shared successfully');
      setRecipientEmail('');
    } catch (error) {
      console.error('Error sharing calendar:', error);
      Alert.alert('Error', 'Failed to share calendar');
    } finally {
      setIsLoading(false);
    }
  };

  const revokeAccess = async (email) => {
    setIsLoading(true);
    try {
      // 1. Find the user whose access is being revoked
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', email));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        Alert.alert('Error', 'User not found');
        setIsLoading(false);
        return;
      }

      const revokedUserId = querySnapshot.docs[0].id;

      // 2. Update current user's document
      const currentUserRef = doc(db, 'users', auth.currentUser.uid);
      const currentUserDoc = await getDoc(currentUserRef);
      const currentUserData = currentUserDoc.data();

      const updatedSharedWithOthers = currentUserData.sharedWithOthers.filter(
        sharedEmail => sharedEmail !== email
      );

      // 3. Update calendar_events
      const calendarEventsRef = doc(db, 'calendar_events', auth.currentUser.uid);
      await updateDoc(calendarEventsRef, {
        sharedWith: updatedSharedWithOthers,
        lastUpdated: new Date().toISOString(),
      });

      // 4. Update both users' documents
      // Update current user's document
      await updateDoc(currentUserRef, {
        sharedWithOthers: updatedSharedWithOthers,
        lastUpdated: new Date().toISOString()
      });

      // Update revoked user's document
      const revokedUserRef = doc(db, 'users', revokedUserId);
      const revokedUserDoc = await getDoc(revokedUserRef);
      const revokedUserSharedWithMe = revokedUserDoc.data().sharedWithMe.filter(
        sharedEmail => sharedEmail !== auth.currentUser.email
      );

      await updateDoc(revokedUserRef, {
        sharedWithMe: revokedUserSharedWithMe,
        lastUpdated: new Date().toISOString()
      });

      Alert.alert('Success', 'Calendar access revoked successfully');
    } catch (error) {
      console.error('Error revoking access:', error);
      Alert.alert('Error', 'Failed to revoke calendar access');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Set up real-time listener for the current user's document
    const userRef = doc(db, 'users', auth.currentUser.uid);
    
    const unsubscribe = onSnapshot(userRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const userData = docSnapshot.data();
        setSharedWithMe(userData.sharedWithMe || []);
        setSharedWithOthers(userData.sharedWithOthers || []);
      }
    }, (error) => {
      console.error("Error listening to user document:", error);
    });
    return () => unsubscribe();
  }, []);

  const renderSharedCalendars = () => {
    return (
      <View>
        <View style={styles.shareSection}>
          <Text style={styles.subTitle}>Shared with me by:</Text>
          {sharedWithMe.length === 0 ? (
            <Text style={styles.emptyText}>No calendars shared with you</Text>
          ) : (
            sharedWithMe.map((email, index) => (
              <View key={index} style={styles.shareItem}>
                <Text style={styles.shareEmail}>{email}</Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.shareSection}>
          <Text style={styles.subTitle}>Shared by me with:</Text>
          {sharedWithOthers.length === 0 ? (
            <Text style={styles.emptyText}>You haven't shared your calendar</Text>
          ) : (
            sharedWithOthers.map((email, index) => (
              <View key={index} style={styles.shareItem}>
                <Text style={styles.shareEmail}>{email}</Text>
                <TouchableOpacity 
                  style={styles.revokeButton}
                  onPress={() => {
                    Alert.alert(
                      'Revoke Access',
                      `Are you sure you want to revoke calendar access for ${email}?`,
                      [
                        {
                          text: 'Cancel',
                          style: 'cancel',
                        },
                        {
                          text: 'Revoke',
                          style: 'destructive',
                          onPress: () => revokeAccess(email),
                        },
                      ]
                    );
                  }}
                >
                  <Text style={styles.revokeButtonText}>Revoke Access</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.shareSection}>
        <Text style={styles.sectionTitle}>Share Your Calendar</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter recipient's email"
          value={recipientEmail}
          onChangeText={setRecipientEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TouchableOpacity 
          style={[styles.shareButton, isLoading && styles.disabledButton]}
          onPress={shareCalendar}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.shareButtonText}>Share Calendar</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.sharedSection}>
        <Text style={styles.sectionTitle}>Shared Calendars</Text>
        {renderSharedCalendars()}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  shareSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#2E66E7',
  },
  subTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  shareButton: {
    backgroundColor: '#2E66E7',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.7,
  },
  shareButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  shareEmail: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    flex: 1,
  },
  revokeButton: {
    backgroundColor: '#dc3545',
    padding: 8,
    borderRadius: 6,
    marginLeft: 12,
  },
  revokeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default CalendarSharingComponent;