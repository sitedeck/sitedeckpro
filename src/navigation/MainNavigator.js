import React from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Text, View } from 'react-native'

const Tab = createBottomTabNavigator()

function PlaceholderScreen({ name }) {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
      <Text style={{ fontSize: 20, fontWeight: 'bold' }}>{name}</Text>
      <Text style={{ color: '#888', marginTop: 8 }}>Screen coming soon</Text>
    </View>
  )
}

export default function MainNavigator() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Home" component={() => <PlaceholderScreen name="Home" />} />
      <Tab.Screen name="Projects" component={() => <PlaceholderScreen name="Projects" />} />
      <Tab.Screen name="Messages" component={() => <PlaceholderScreen name="Messages" />} />
      <Tab.Screen name="Profile" component={() => <PlaceholderScreen name="Profile" />} />
    </Tab.Navigator>
  )
}