import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native'
import { signOut } from 'firebase/auth'
import { auth } from '../../firebase.config'

export default function ProfileScreen({ navigation }) {
  const handleLogout = async () => {
    await signOut(auth)
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>U</Text>
        </View>
        <Text style={styles.title}>Profile</Text>
      </View>

      <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('AdminSettings')}>
        <Text style={styles.menuText}>⚙️ Settings</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
        <Text style={[styles.menuText, { color: '#dc2626' }]}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  header: { alignItems: 'center', padding: 40, backgroundColor: '#1E3A5F' },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#D97706', alignItems: 'center', justifyContent: 'center',
    marginBottom: 12
  },
  avatarText: { fontSize: 32, color: '#fff', fontWeight: 'bold' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  menuItem: {
    backgroundColor: '#fff', padding: 18, marginHorizontal: 16, marginTop: 12,
    borderRadius: 12, flexDirection: 'row', alignItems: 'center'
  },
  menuText: { fontSize: 16, color: '#1f2937' }
})
