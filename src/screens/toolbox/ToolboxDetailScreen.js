import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore'
import { auth, db } from '../../firebase.config'

export default function ToolboxDetailScreen({ navigation, route }) {
  const { talkId } = route.params
  const [talk, setTalk] = useState(null)
  const [userId, setUserId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [signing, setSigning] = useState(false)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) setUserId(user.uid)
    })
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    const load = async () => {
      const snap = await getDoc(doc(db, 'toolboxTalks', talkId))
      if (snap.exists()) setTalk({ id: snap.id, ...snap.data() })
      setLoading(false)
    }
    load()
  }, [talkId])

  const handleSignOff = async () => {
    setSigning(true)
    try {
      const updatedAttendees = talk.attendees.map(a =>
        a.userId === userId ? { ...a, signedOff: true, signedOffAt: new Date().toISOString() } : a
      )
      await updateDoc(doc(db, 'toolboxTalks', talkId), { attendees: updatedAttendees })
      const snap = await getDoc(doc(db, 'toolboxTalks', talkId))
      setTalk({ id: snap.id, ...snap.data() })
      Alert.alert('Signed', 'Your attendance has been confirmed.')
    } catch (err) { Alert.alert('Error', err.message) }
    finally { setSigning(false) }
  }

  const formatDate = (iso) => {
    if (!iso) return ''
    return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  }

  const myAttendee = talk?.attendees?.find(a => a.userId === userId)

  if (loading) return <View style={styles.loading}><ActivityIndicator size="large" color="#2563eb" /></View>
  if (!talk) return <View style={styles.loading}><Text>Talk not found</Text></View>

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Toolbox Talk</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.topic}>{talk.topic}</Text>
        <View style={styles.metaRow}>
          <View style={styles.metaItem}><Ionicons name="calendar-outline" size={16} color="#666" /><Text style={styles.metaText}>{formatDate(talk.date)}</Text></View>
          <View style={styles.metaItem}><Ionicons name="person-outline" size={16} color="#666" /><Text style={styles.metaText}>Conducted by {talk.conductorName}</Text></View>
        </View>
        <View style={[styles.lockBadge, { backgroundColor: talk.locked ? '#f0fdf4' : '#fef3c7' }]}>
          <Ionicons name={talk.locked ? 'lock-closed' : 'lock-open-outline'} size={14} color={talk.locked ? '#16a34a' : '#f59e0b'} />
          <Text style={[styles.lockText, { color: talk.locked ? '#16a34a' : '#f59e0b' }]}>{talk.locked ? 'Locked' : 'Open'}</Text>
        </View>

        {talk.description && <>
          <Text style={styles.sectionLabel}>Notes</Text>
          <Text style={styles.description}>{talk.description}</Text>
        </>}

        <Text style={styles.sectionLabel}>Attendees ({talk.attendees?.length || 0})</Text>
        {talk.attendees?.map((a, i) => (
          <View key={i} style={styles.attendeeRow}>
            <Ionicons name={a.signedOff ? 'checkmark-circle' : 'ellipse-outline'} size={18}
              color={a.signedOff ? '#16a34a' : '#ccc'} />
            <Text style={[styles.attendeeName, a.signedOff && styles.attendeeSigned]}>
              {a.userName || a.userId}
            </Text>
            {a.signedOffAt && <Text style={styles.signedTime}>{new Date(a.signedOffAt).toLocaleString()}</Text>}
          </View>
        ))}

        {myAttendee && !myAttendee.signedOff && talk.locked && (
          <TouchableOpacity style={styles.signOffBtn} onPress={handleSignOff} disabled={signing}>
            {signing ? <ActivityIndicator color="#fff" /> : <Text style={styles.signOffText}>Sign Off on Attendance</Text>}
          </TouchableOpacity>
        )}
        {myAttendee?.signedOff && (
          <View style={styles.signedBadge}>
            <Ionicons name="checkmark-circle" size={20} color="#16a34a" />
            <Text style={styles.signedBadgeText}>You have signed off</Text>
          </View>
        )}
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
  topic: { fontSize: 24, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 12 },
  metaRow: { flexDirection: 'row', gap: 20, marginBottom: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 14, color: '#666' },
  lockBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, alignSelf: 'flex-start', marginBottom: 16 },
  lockText: { fontSize: 13, fontWeight: '500' },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: '#888', textTransform: 'uppercase', marginTop: 20, marginBottom: 8 },
  description: { fontSize: 15, color: '#333', lineHeight: 22 },
  attendeeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  attendeeName: { fontSize: 15, color: '#333', flex: 1 },
  attendeeSigned: { color: '#16a34a', fontWeight: '500' },
  signedTime: { fontSize: 12, color: '#888' },
  signOffBtn: { backgroundColor: '#2563eb', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 24 },
  signOffText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  signedBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#f0fdf4', padding: 16, borderRadius: 8, marginTop: 24 }
})