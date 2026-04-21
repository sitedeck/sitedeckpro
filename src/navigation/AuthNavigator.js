import React, { useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../../firebase.config'
import { createStackNavigator } from '@react-navigation/stack'
import LoginScreen from '../screens/auth/LoginScreen'
import SignUpScreen from '../screens/auth/SignUpScreen'
import PendingScreen from '../screens/auth/PendingScreen'
import RejectedScreen from '../screens/auth/RejectedScreen'
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen'

const Stack = createStackNavigator()

const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="SignUp" component={SignUpScreen} />
    <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
  </Stack.Navigator>
)

export default function AuthNavigator({ onApproved }) {
  const [user, setUser] = useState(null)
  const [userStatus, setUserStatus] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser)

      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid))
          if (userDoc.exists()) {
            const status = userDoc.data().status
            setUserStatus(status)
            if (status === 'approved' && onApproved) {
              onApproved()
            }
          } else {
            setUserStatus(null)
          }
        } catch (error) {
          console.error('Error fetching user status:', error)
          setUserStatus(null)
        }
      } else {
        setUserStatus(null)
      }

      setLoading(false)
    })

    return () => unsubscribe()
  }, [onApproved])

  if (loading) {
    return null
  }

  if (!user || userStatus === null) {
    return <AuthStack />
  }

  if (userStatus === 'pending') {
    return <PendingScreen />
  }

  if (userStatus === 'rejected') {
    return <RejectedScreen />
  }

  // approved — parent handles main app rendering via onApproved callback
  return null
}