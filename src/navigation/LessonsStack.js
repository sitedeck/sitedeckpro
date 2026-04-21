import React from 'react'
import { createStackNavigator } from '@react-navigation/stack'
import LessonsScreen from '../screens/lessons/LessonsScreen'
import LessonDetailScreen from '../screens/lessons/LessonDetailScreen'
import NewLessonScreen from '../screens/lessons/NewLessonScreen'
import EditLessonScreen from '../screens/lessons/EditLessonScreen'

const Stack = createStackNavigator()

export default function LessonsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="LessonsList" component={LessonsScreen} />
      <Stack.Screen name="LessonDetail" component={LessonDetailScreen} />
      <Stack.Screen name="NewLesson" component={NewLessonScreen} />
      <Stack.Screen name="EditLesson" component={EditLessonScreen} />
    </Stack.Navigator>
  )
}