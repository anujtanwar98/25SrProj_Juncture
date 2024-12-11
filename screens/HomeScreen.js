import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, SafeAreaView, ScrollView } from 'react-native';
import CombinedCalendar from './CombinedCalendar';
import CreateEvent from './CreateEvent';

export default function HomeScreen({ navigation }) {
  return (
    <>
    <SafeAreaView style={styles.container}>
      {/* <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}> */}
        <CombinedCalendar />
        {/* <CreateEvent /> */}
      {/* </ScrollView> */}
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
});