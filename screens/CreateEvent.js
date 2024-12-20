import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, ActivityIndicator, TextInput, ScrollView } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../auth/firebase';

const API_BASE_URL = 'https://two5srproj-server.onrender.com';

export default function CreateEvent() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isCreatingEvent, setIsCreatingEvent] = useState(false);
    const [status, setStatus] = useState('');
    const [error, setError] = useState(null);
    const [title, setTitle] = useState('');
    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date(Date.now() + 30 * 60000));
    const [participants, setParticipants] = useState([{ name: '', email: '' }]);
    const [location, setLocation] = useState('');
    const [description, setDescription] = useState('');

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(user => {
            if (!user) {
                setError('Please login first');
                return;
            }
            checkNylasAuth();
        });

        return () => unsubscribe();
    }, []);

    const checkNylasAuth = async () => {
        try {
            const grantId = await AsyncStorage.getItem('nylasGrantId');
            if (grantId) {
                setIsAuthenticated(true);
                setError(null);
            } else {
                setError('Please connect your calendar first');
            }
        } catch (error) {
            console.error('Error checking Nylas auth:', error);
            setError('Failed to check calendar connection status');
        }
    };

    const addParticipant = () => {
        setParticipants([...participants, { name: '', email: '' }]);
    };

    const removeParticipant = (index) => {
        const newParticipants = participants.filter((_, i) => i !== index);
        setParticipants(newParticipants);
    };

    const updateParticipant = (index, field, value) => {
        const newParticipants = [...participants];
        newParticipants[index][field] = value;
        setParticipants(newParticipants);
    };

    const createEvent = async () => {
        if (!auth.currentUser) {
            setError('Please login first');
            return;
        }

        if (!isAuthenticated) {
            setError('Please connect your calendar first');
            return;
        }

        if (!title.trim()) {
            setError('Please enter an event title');
            return;
        }

        // Validate participants
        const validParticipants = participants.filter(p => p.name.trim() && p.email.trim());
        // if (validParticipants.length < participants.length) {
        //     setError('Please fill in all participant details or remove empty entries');
        //     return;
        // }

        try {
            setIsCreatingEvent(true);
            setError(null);
            setStatus('Creating event...');

            const eventData = {
                title: title.trim(),
                start_time: startDate.toISOString(),
                end_time: endDate.toISOString(),
                participants: validParticipants,
                location: location.trim(),
                description: description.trim()
            };

            const response = await fetch(`${API_BASE_URL}/nylas/create-event`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(eventData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to create event');
            }

            const event = await response.json();
            setStatus('Event created successfully!');
            setTitle('');
            setLocation('');
            setDescription('');
            setParticipants([{ name: '', email: '' }]);
            setTimeout(() => setStatus(''), 3000);
        } catch (error) {
            console.error('Error creating event:', error);
            setError(`Failed to create event: ${error.message}`);
        } finally {
            setIsCreatingEvent(false);
        }
    };

    return (
        <ScrollView>
            <View style={styles.container}>
                {/* <Text style={styles.title}>Create Calendar Event</Text> */}

                {error && (
                    <Text style={styles.errorText}>{error}</Text>
                )}

                {status ? (
                    <Text style={styles.statusText}>{status}</Text>
                ) : null}

                <TextInput
                    style={styles.input}
                    placeholder="Event Title"
                    value={title}
                    onChangeText={setTitle}
                />

                <View style={styles.datePickerContainer}>
                    <Text style={styles.dateLabel}>Start Time:</Text>
                    <DateTimePicker
                        value={startDate}
                        mode="datetime"
                        onChange={(event, date) => {
                            if (date) {
                                setStartDate(date);
                                if (endDate <= date) {
                                    setEndDate(new Date(date.getTime() + 30 * 60000));
                                }
                            }
                        }}
                        style={styles.datePicker}
                    />
                </View>

                <View style={styles.datePickerContainer}>
                    <Text style={styles.dateLabel}>End Time:</Text>
                    <DateTimePicker
                        value={endDate}
                        mode="datetime"
                        minimumDate={startDate}
                        onChange={(event, date) => {
                            if (date) setEndDate(date);
                        }}
                        style={styles.datePicker}
                    />
                </View>

                <Text style={styles.sectionTitle}>Participants</Text>
                {participants.map((participant, index) => (
                    <View key={index} style={styles.participantContainer}>
                        <TextInput
                            style={styles.participantInput}
                            placeholder="Name"
                            value={participant.name}
                            onChangeText={(value) => updateParticipant(index, 'name', value)}
                        />
                        <TextInput
                            style={styles.participantInput}
                            placeholder="Email"
                            value={participant.email}
                            onChangeText={(value) => updateParticipant(index, 'email', value)}
                            keyboardType="email-address"
                        />
                        {participants.length > 1 && (
                            <TouchableOpacity
                                style={styles.removeButton}
                                onPress={() => removeParticipant(index)}>
                                <Text style={styles.removeButtonText}>Remove</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                ))}

                <TouchableOpacity
                    style={styles.addButton}
                    onPress={addParticipant}>
                    <Text style={styles.addButtonText}>Add Participant</Text>
                </TouchableOpacity>

                <TextInput
                    style={styles.input}
                    placeholder="Location"
                    value={location}
                    onChangeText={setLocation}
                />
                <TextInput
                    style={[styles.input, styles.multilineInput]}
                    placeholder="Description"
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    numberOfLines={4}
                />

                <TouchableOpacity
                    style={[
                        styles.button,
                        isCreatingEvent && styles.disabledButton,
                        !isAuthenticated && styles.disabledButton
                    ]}
                    onPress={createEvent}
                    disabled={isCreatingEvent || !isAuthenticated}>
                    {isCreatingEvent ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.buttonText}>Create Event</Text>
                    )}
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 20,
        backgroundColor: '#fff',
        margin: 10,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 20,
        color: '#2E66E7',
        textAlign: 'center',
    },
    button: {
        backgroundColor: '#34C759',
        paddingHorizontal: 30,
        paddingVertical: 15,
        borderRadius: 25,
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
    statusText: {
        marginVertical: 10,
        fontSize: 16,
        color: '#2E66E7',
        textAlign: 'center',
    },
    errorText: {
        marginVertical: 10,
        fontSize: 16,
        color: '#dc3545',
        textAlign: 'center',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 10,
        marginVertical: 10,
        fontSize: 16,
    },
    timeButton: {
        padding: 10,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        marginVertical: 5,
    },
    participantContainer: {
        marginVertical: 5,
        padding: 10,
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
    },
    participantInput: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 10,
        marginVertical: 5,
        fontSize: 16,
    },
    removeButton: {
        backgroundColor: '#dc3545',
        padding: 8,
        borderRadius: 5,
        alignItems: 'center',
        marginTop: 5,
    },
    removeButtonText: {
        color: '#fff',
        fontSize: 14,
    },
    addButton: {
        backgroundColor: '#6c757d',
        padding: 10,
        borderRadius: 5,
        alignItems: 'center',
        marginVertical: 10,
    },
    addButtonText: {
        color: '#fff',
        fontSize: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 20,
        marginBottom: 10,
    },
    multilineInput: {
        height: 100,
        textAlignVertical: 'top',
    },
});
