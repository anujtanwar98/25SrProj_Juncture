import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import HomeScreen from './screens/HomeScreen';
import { auth } from './auth/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import MemoryWall from './screens/MemoryWall';
import ProfileScreen from './screens/ProfileScreen';
import { SwatchBook, CalendarDays, CircleUserRound } from 'lucide-react-native';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function BottomTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: {
          position: 'absolute',
          bottom: 25,
          left: 20,
          right: 20,
          elevation: 0,
          marginLeft: 10,
          marginRight: 10,
          backgroundColor: '#ffffff',
          borderRadius: 50,
          height: 60,
          shadowColor: '#000',
          shadowOffset: {
            width: 0,
            height: 10,
          },
          shadowOpacity: 0.25,
          shadowRadius: 3.5,
        },
      }}>
      <Tab.Screen
        name="Memory Wall"
        component={MemoryWall}
        options={{
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <SwatchBook
              size={20}
              color={focused ? '#007AFF' : '#666666'}
            />
          ),
          tabBarLabel: 'Memory Wall'
        }}
      />
      <Tab.Screen
        name="Calendar"
        component={HomeScreen}
        options={{
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <CalendarDays
              size={20}
              color={focused ? '#007AFF' : '#666666'}
            />
          ),
          tabBarLabel: 'Calendar'
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <CircleUserRound
              size={20}
              color={focused ? '#007AFF' : '#666666'}
            />
          ),
          tabBarLabel: 'Profile'
        }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (initializing) setInitializing(false);
    });
    return unsubscribe;
  }, []);

  if (initializing) return null;

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName={user ? "Home" : "Login"}>
        {user ? (
          <Stack.Screen 
            name="Home" 
            component={BottomTabs} 
            options={{ headerShown: false }} 
          />
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Register" component={RegisterScreen} options={{ headerShown: false }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}