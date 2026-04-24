import React, { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native'
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { auth, db } from '../../firebase.config'
import { doc, collection, addDoc, query, where, getDocs } from 'firebase/firestore'
import { COL_ORGANIZATIONS, COL_USERS } from '../../constants/collections'
import { STATUS_PENDING, STATUS_APPROVED } from '../../constants/statuses'
import { ADMIN, MEMBER } from '../../constants/roles'
import { PLAN_CORE } from '../../constants/plans'

export default function SignUpScreen({ navigation }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSignUp = async () => {
    if (!name || !email || !password || !companyName) {
      Alert.alert('Error', 'Please fill in all fields')
      return
    }

    setLoading(true)
    try {
      // Check if org already exists
      const orgQuery = query(
        collection(db, COL_ORGANIZATIONS),
        where('name', '==', companyName.trim())
      )
      const orgSnap = await getDocs(orgQuery)
      const orgExists = !orgSnap.empty

      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      await updateProfile(userCredential.user, { displayName: name })

      if (orgExists) {
        // Joining existing org — pending status
        const orgId = orgSnap.docs[0].id
        await addDoc(collection(db, COL_USERS), {
          uid: userCredential.user.uid,
          name: name.trim(),
          email: email.trim().toLowerCase(),
          role: MEMBER,
          status: STATUS_PENDING,
          orgId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
        // TODO: Send push notification to all admins in org
        Alert.alert('Request Sent', 'Your account is pending approval from your admin.')
      } else {
        // First user — create org and admin user
        const orgRef = await addDoc(collection(db, COL_ORGANIZATIONS), {
          name: companyName.trim(),
          plan: PLAN_CORE,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })

        await addDoc(collection(db, COL_USERS), {
          uid: userCredential.user.uid,
          name: name.trim(),
          email: email.trim().toLowerCase(),
          role: ADMIN,
          status: STATUS_APPROVED,
          orgId: orgRef.id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      }
    } catch (error) {
      Alert.alert('Sign Up Failed', error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Create Account</Text>
      <Text style={styles.subtitle}>Sign up to get started</Text>

      <TextInput
        style={styles.input}
        placeholder="Full Name"
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
      />
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <TextInput
        style={styles.input}
        placeholder="Company Name"
        value={companyName}
        onChangeText={setCompanyName}
        autoCapitalize="words"
      />

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleSignUp}
        disabled={loading}
      >
        <Text style={styles.buttonText}>{loading ? 'Creating...' : 'Sign Up'}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Login')}>
        <Text style={styles.linkText}>
          Already have an account? <Text style={styles.linkBold}>Log In</Text>
        </Text>
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
    marginBottom: 8
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    marginBottom: 16,
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
  linkText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14
  },
  linkBold: {
    color: '#2563eb',
    fontWeight: '600'
  }
})