import React, { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native'
import { sendPasswordResetEmail } from 'firebase/auth'
import { auth } from '../../firebase.config'

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  const handleReset = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email address')
      return
    }

    setLoading(true)
    try {
      await sendPasswordResetEmail(auth, email)
      Alert.alert('Email Sent', 'Check your inbox for password reset instructions.', [
        { text: 'OK', onPress: () => navigation.navigate('Login') }
      ])
    } catch (error) {
      Alert.alert('Reset Failed', error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Reset Password</Text>
      <Text style={styles.subtitle}>
        Enter your email and we'll send you a link to reset your password.
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleReset}
        disabled={loading}
      >
        <Text style={styles.buttonText}>{loading ? 'Sending...' : 'Send Reset Link'}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={styles.backText}>← Back to Log In</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    backgroundColor: '#fff'
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 12
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
    lineHeight: 24
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    marginBottom: 24,
    backgroundColor: '#fafafa'
  },
  button: {
    backgroundColor: '#2563eb',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 24
  },
  buttonDisabled: {
    backgroundColor: '#93c5fd'
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  backText: {
    textAlign: 'center',
    color: '#2563eb',
    fontSize: 14
  }
})