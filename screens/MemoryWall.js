import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const MemorySection = ({ memory }) => (
  <View style={styles.memorySection}>
    <TouchableOpacity style={styles.headerContainer}>
      <View>
        <Text style={styles.title}>{memory.title}</Text>
        <Text style={styles.date}>{memory.date}</Text>
      </View>
      <Text style={styles.arrow}>→</Text>
    </TouchableOpacity>
    
    <View style={styles.photoGrid}>
      {memory.photos.map((photo, index) => (
        <View key={photo.id} style={styles.photoContainer}>
          <View style={styles.photo} />
        </View>
      ))}
      {memory.photos.length < 9 && (
        <TouchableOpacity style={styles.addPhotoButton}>
          <Text style={styles.addPhotoText}>Add photos</Text>
        </TouchableOpacity>
      )}
    </View>
  </View>
);

const MemoryWall = () => {
  const memories = [
    {
      id: 1,
      title: 'Game night',
      date: 'Nov 17, 2024',
      photos: Array(3).fill().map((_, i) => ({ id: i }))
    },
    {
      id: 2,
      title: "Sarah's birthday dinner",
      date: 'Nov 8, 2024',
      photos: Array(5).fill().map((_, i) => ({ id: i }))
    },
    {
      id: 3,
      title: 'Hiking trip',
      date: 'Nov 3, 2024',
      photos: Array(4).fill().map((_, i) => ({ id: i }))
    }
  ];

  return (
    <ScrollView style={styles.scrollView}>
      <SafeAreaView style={styles.container}>
      <Text style={styles.header}>Memories</Text>
      {memories.map(memory => (
        <MemorySection key={memory.id} memory={memory} />
      ))}
      </SafeAreaView>
    </ScrollView>
  );
};

const styles = {
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    padding: 16,
    backgroundColor: '#ffffff',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  memorySection: {
    marginBottom: 32,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  date: {
    fontSize: 14,
    color: '#666',
  },
  arrow: {
    color: '#999',
    fontSize: 18,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  photoContainer: {
    width: '33.33%',
    aspectRatio: 1,
    padding: 2,
  },
  photo: {
    flex: 1,
    backgroundColor: '#E5E5E5',
  },
  addPhotoButton: {
    width: '33.33%',
    aspectRatio: 1,
    padding: 2,
  },
  addPhotoText: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
  },
};

export default MemoryWall;