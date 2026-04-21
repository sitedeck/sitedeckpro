import React from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createStackNavigator } from '@react-navigation/stack'
import { Ionicons } from '@expo/vector-icons'

import HomeStack from './HomeStack'
import LessonsStack from './LessonsStack'
import ToolsMenuScreen from '../screens/tools/ToolsMenuScreen'
import ProfileScreen from '../screens/profile/ProfileScreen'

// JHA Stack
import JHAListScreen from '../screens/jha/JHAListScreen'
import NewJHAScreen from '../screens/jha/NewJHAScreen'
import JHADetailScreen from '../screens/jha/JHADetailScreen'

// Safety Stack
import SafetyManualsScreen from '../screens/safety/SafetyManualsScreen'
import ManualViewerScreen from '../screens/safety/ManualViewerScreen'

// Toolbox Stack
import ToolboxListScreen from '../screens/toolbox/ToolboxListScreen'
import NewToolboxScreen from '../screens/toolbox/NewToolboxScreen'
import ToolboxDetailScreen from '../screens/toolbox/ToolboxDetailScreen'

// Reports Stack
import ReportsListScreen from '../screens/reports/ReportsListScreen'
import NewReportScreen from '../screens/reports/NewReportScreen'
import ReportDetailScreen from '../screens/reports/ReportDetailScreen'

// Timesheets Stack
import TimesheetScreen from '../screens/timesheets/TimesheetScreen'
import TimesheetHistoryScreen from '../screens/timesheets/TimesheetHistoryScreen'
import TimesheetReviewScreen from '../screens/timesheets/TimesheetReviewScreen'

// Certifications Stack
import CertificationsScreen from '../screens/certifications/CertificationsScreen'
import AddCertScreen from '../screens/certifications/AddCertScreen'
import AdminCertScreen from '../screens/certifications/AdminCertScreen'

// Equipment Stack
import EquipmentListScreen from '../screens/equipment/EquipmentListScreen'
import EquipmentDetailScreen from '../screens/equipment/EquipmentDetailScreen'

// Profile Stack
import AdminSettingsScreen from '../screens/profile/AdminSettingsScreen'

// Communications Stack
import CommunicationsScreen from '../screens/communications/CommunicationsScreen'
import MessageDetailScreen from '../screens/communications/MessageDetailScreen'
import ComposeMessageScreen from '../screens/communications/ComposeMessageScreen'

const Tab = createBottomTabNavigator()
const Stack = createStackNavigator()

const ToolsStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="ToolsMenu" component={ToolsMenuScreen} />
    <Stack.Screen name="JHAList" component={JHAListScreen} />
    <Stack.Screen name="NewJHA" component={NewJHAScreen} />
    <Stack.Screen name="JHADetail" component={JHADetailScreen} />
    <Stack.Screen name="SafetyManuals" component={SafetyManualsScreen} />
    <Stack.Screen name="ManualViewer" component={ManualViewerScreen} />
    <Stack.Screen name="ToolboxList" component={ToolboxListScreen} />
    <Stack.Screen name="NewToolbox" component={NewToolboxScreen} />
    <Stack.Screen name="ToolboxDetail" component={ToolboxDetailScreen} />
    <Stack.Screen name="ReportsList" component={ReportsListScreen} />
    <Stack.Screen name="NewReport" component={NewReportScreen} />
    <Stack.Screen name="ReportDetail" component={ReportDetailScreen} />
    <Stack.Screen name="Timesheet" component={TimesheetScreen} />
    <Stack.Screen name="TimesheetHistory" component={TimesheetHistoryScreen} />
    <Stack.Screen name="TimesheetReview" component={TimesheetReviewScreen} />
    <Stack.Screen name="Certifications" component={CertificationsScreen} />
    <Stack.Screen name="AddCert" component={AddCertScreen} />
    <Stack.Screen name="AdminCert" component={AdminCertScreen} />
    <Stack.Screen name="EquipmentList" component={EquipmentListScreen} />
    <Stack.Screen name="EquipmentDetail" component={EquipmentDetailScreen} />
    <Stack.Screen name="AdminSettings" component={AdminSettingsScreen} />
    <Stack.Screen name="Communications" component={CommunicationsScreen} />
    <Stack.Screen name="MessageDetail" component={MessageDetailScreen} />
    <Stack.Screen name="ComposeMessage" component={ComposeMessageScreen} />
  </Stack.Navigator>
)

const ProfileStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="ProfileMain" component={ProfileScreen} />
    <Stack.Screen name="AdminSettings" component={AdminSettingsScreen} />
  </Stack.Navigator>
)

export default function AppNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName
          if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline'
          else if (route.name === 'Lessons') iconName = focused ? 'clipboard' : 'clipboard-outline'
          else if (route.name === 'Tools') iconName = focused ? 'construct' : 'construct-outline'
          else if (route.name === 'Profile') iconName = focused ? 'person' : 'person-outline'
          return <Ionicons name={iconName} size={size} color={color} />
        },
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#888',
        headerShown: false,
        tabBarStyle: { paddingTop: 6, paddingBottom: 6, height: 60 },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '500' }
      })}
    >
      <Tab.Screen name="Home" component={HomeStack} />
      <Tab.Screen name="Lessons" component={LessonsStack} />
      <Tab.Screen name="Tools" component={ToolsStack} />
      <Tab.Screen name="Profile" component={ProfileStack} />
    </Tab.Navigator>
  )
}