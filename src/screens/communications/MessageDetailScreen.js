import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore'
import { auth, db } from '../../firebase.config'
import { COL_COMMUNICATIONS } from '../../constants/collections'

const TYPE_COLORS = { 'Safety Alert': '#dc2626', 'Event': '#f59e0b', 'General': '#2563eb' }
const TYPE_BG = { 'Safety Alert': '#fef2f2', 'Event': '#fffbeb', 'General': '#eff6ff' }

export default function MessageDetailScreen({ navigation, route }) {
  const { messageId } = route.params
  const [message, setMessage] = useState(null)
  const [userId, setUserId] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) setUserId(user.uid)
    })
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    const load = async () => {
      const snap = await getDoc(doc(db, COL_COMMUNICATIONS, messageId))
      if (snap.exists()) {
        const data = { id: snap.id, ...snap.data() }
        setMessage(data)
        if (!data.readBy?.includes(userId)) {
          await updateDoc(doc(db, COL_COMMUNICATIONS, messageId), {
            readBy: arrayUnion(userId)
          })
        }
      }
      setLoading(false)
    }
    load()
  }, [messageId, userId])

  const formatDate = (iso) => {
    if (!iso) return ''
    return new Date(iso).toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  if (loading) return <View style={styles.loading}><ActivityIndicator size="large" color="#2563eb" /></View>
  if (!message) return <View style={styles.loading}><Text>Message not found</Text></View>

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Message</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={[styles.typeBadge, { backgroundColor: TYPE_BG[message.type] || '#f5f5f5' }]}>
          <Text style={[styles.typeText, { color: TYPE_COLORS[message.type] || '#888' }]}>{message.type || 'General'}</Text>
        </View>
        <Text style={styles.title}>{message.title}</Text>
        <View style={styles.metaRow}>
          <Ionicons name="person-outline" size={16} color="#888" />
          <Text style={styles.metaText}>From: {message.senderName || 'Unknown'}</Text>
        </View>
        <View style={styles.metaRow}>
          <Ionicons name="calendar-outline" size={16} color="#888" />
          <Text style={styles.metaText}>{formatDate(message.createdAt)}</Text>
        </View>
        <View style={styles.divider} />
        <Text style={styles.body}>{message.body}</Text>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 56, paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#1a1a1a' },
  scrollView: { flex: 1 },
  content: { padding: 20, paddingBottom: 100 },
  typeBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, marginBottom: 12 },
  typeText: { fontSize: 12, fontWeight: '600' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 16 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  metaText: { fontSize: 14, color: '#888' },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 20 },
  body: { fontSize: 16, color: '#333', lineHeight: 24 }
})