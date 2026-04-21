import React from 'react'
import { createStackNavigator } from '@react-navigation/stack'
import HomeScreen from '../screens/home/HomeScreen'
import LessonDetailScreen from '../screens/lessons/LessonDetailScreen'
import NewLessonScreen from '../screens/lessons/NewLessonScreen'
import EditLessonScreen from '../screens/lessons/EditLessonScreen'

const Stack = createStackNavigator()

export default function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeMain" component={HomeScreen} />
      <Stack.Screen name="LessonDetail" component={LessonDetailScreen} />
      <Stack.Screen name="NewLesson" component={NewLessonScreen} />
      <Stack.Screen name="EditLesson" component={EditLessonScreen} />
    </Stack.Navigator>
  )
}