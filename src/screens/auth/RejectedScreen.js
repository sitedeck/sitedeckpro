import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { signOut } from 'firebase/auth'
import { auth } from '../../firebase.config'

export default function RejectedScreen() {
  const handleLogout = async () => {
    try {
      await signOut(auth)
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>✕</Text>
      </View>
      <Text style={styles.title}>Access Denied</Text>
      <Text style={styles.message}>
        Your access request was not approved. Please contact support@sitedeck.pro for further assistance.
      </Text>
      <TouchableOpacity style={styles.button} onPress={handleLogout}>
        <Text style={styles.buttonText}>Log Out</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff'
  },
  iconContainer: {
    marginBottom: 24
  },
  icon: {
    fontSize: 64,
    color: '#dc2626'
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 16,
    textAlign: 'center'
  },
  message: {
    fontSize: 16,
    color: '#444',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32
  },
  button: {
    backgroundColor: '#6b7280',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  }
})