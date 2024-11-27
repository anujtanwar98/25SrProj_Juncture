import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, SafeAreaView, ScrollView } from 'react-native';
import { auth } from '../auth/firebase';
import { signOut } from 'firebase/auth';
import CalendarUi from './CalendarUi';
import CalendarSync from './CalendarSync';
import PullCalendar from './PullCalendar';
import CalendarSharingComponent from './sharedCalendar';
import SharedCalendarsViewer from './SharedCalendarsViewer';
import CombinedCalendar from './CombinedCalendar';

export default function HomeScreen({ navigation }) {
  // const handleSignOut = async () => {
  //   try {
  //     await signOut(auth);
  //     navigation.replace('Login');
  //   } catch (error) {
  //     Alert.alert('Error', error.message);
  //   }
  // };

  // const renderHeader = () => (
  //   <View style={styles.header}>
  //     <View style={styles.headerLeft}>
  //       <Text style={styles.welcomeText}>Welcome!</Text>
  //       <Text style={styles.emailText}>{auth.currentUser?.email}</Text>
  //       <Text style={styles.emailText}>{auth.currentUser?.displayName}</Text>
  //     </View>
  //     <TouchableOpacity
  //       style={styles.logoutButton}
  //       onPress={handleSignOut}>
  //       <Text style={styles.logoutButtonText}>Sign out</Text>
  //     </TouchableOpacity>
  //   </View>
  // );

  return (
    <>
    <SafeAreaView style={styles.container}>
      {/* {renderHeader()} */}
      <CombinedCalendar />
      {/* <PullCalendar /> */}
      {/* <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}> */}
        {/* <CalendarUi /> */}
        {/* <CalendarSharingComponent /> */}
        {/* <SharedCalendarsViewer /> */}
        {/* <CalendarSync /> */}
        {/* <CombinedCalendar /> */}
      {/* </ScrollView> */}
      {/* <PullCalendar /> */}
    </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    // backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerLeft: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a73e8',
    marginBottom: 4,
  },
  emailText: {
    fontSize: 14,
    color: '#666',
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