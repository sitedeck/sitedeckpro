import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { onAuthStateChanged } from 'firebase/auth'
import { addDoc, collection, onSnapshot, query, where, orderBy } from 'firebase/firestore'
import { auth, db } from '../../firebase.config'

export default function NewToolboxScreen() {
  const navigation = useNavigation()
  const [orgId, setOrgId] = useState(null)
  const [userId, setUserId] = useState(null)
  const [userName, setUserName] = useState('')
  const [projects, setProjects] = useState([])
  const [topic, setTopic] = useState('')
  const [description, setDescription] = useState('')
  const [selectedProject, setSelectedProject] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [attendees, setAttendees] = useState([])
  const [crewMembers, setCrewMembers] = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid)
        const { getDoc, doc } = require('firebase/firestore')
        const userDoc = await getDoc(doc(db, 'users', user.uid))
        if (userDoc.exists()) {
          setOrgId(userDoc.data().orgId)
          setUserName(user.displayName || userDoc.data().name || 'Unknown')
          const projQ = query(collection(db, 'projects'), where('orgId', '==', userDoc.data().orgId), orderBy('createdAt', 'desc'))
          onSnapshot(projQ, snap => setProjects(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
          const userQ = query(collection(db, 'users'), where('orgId', '==', userDoc.data().orgId))
          onSnapshot(userQ, snap => setCrewMembers(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
        }
      }
    })
    return () => unsubscribe()
  }, [])

  const toggleAttendee = (userId) => {
    setAttendees(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId])
  }

  const handleSubmit = async () => {
    if (!topic.trim()) { Alert.alert('Required', 'Topic is required'); return }
    setSaving(true)
    try {
      await addDoc(collection(db, 'toolboxTalks'), {
        orgId,
        topic: topic.trim(),
        description: description.trim(),
        projectId: selectedProject || null,
        date,
        conductorId: userId,
        conductorName: userName,
        attendees: attendees.map(id => ({ userId: id, signedOff: false })),
        locked: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      Alert.alert('Saved', 'Toolbox talk created and locked.', [{ text: 'OK', onPress: () => navigation.goBack() }])
    } catch (err) { Alert.alert('Error', err.message) }
    finally { setSaving(false) }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Toolbox Talk</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.label}>Topic *</Text>
        <TextInput style={styles.input} placeholder="Safety topic" value={topic} onChangeText={setTopic} />

        <Text style={styles.label}>Notes / Description</Text>
        <TextInput style={styles.textArea} placeholder="Talk notes..." value={description}
          onChangeText={setDescription} multiline numberOfLines={3} textAlignVertical="top" />

        <Text style={styles.label}>Project</Text>
        <View style={styles.pillRow}>
          {projects.map(p => (
            <TouchableOpacity key={p.id} style={[styles.pill, selectedProject === p.id && styles.pillActive]}
              onPress={() => setSelectedProject(selectedProject === p.id ? '' : p.id)}>
              <Text style={[styles.pillText, selectedProject === p.id && styles.pillTextActive]}>{p.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Date</Text>
        <TextInput style={styles.input} value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />

        <Text style={styles.label}>Select Attendees</Text>
        <View style={styles.attendeeList}>
          {crewMembers.map(m => (
            <TouchableOpacity key={m.id} style={[styles.attendeeItem, attendees.includes(m.id) && styles.attendeeSelected]}
              onPress={() => toggleAttendee(m.id)}>
              <Ionicons name={attendees.includes(m.id) ? 'checkbox' : 'square-outline'}
                size={18} color={attendees.includes(m.id) ? '#16a34a' : '#888'} />
              <Text style={[styles.attendeeName, attendees.includes(m.id) && styles.attendeeNameSelected]}>
                {m.name || m.email}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={[styles.submitBtn, saving && styles.submitBtnDisabled]}
          onPress={handleSubmit} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Create & Lock Talk</Text>}
        </TouchableOpacity>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 56, paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#1a1a1a' },
  scrollView: { flex: 1 },
  content: { padding: 20, paddingBottom: 100 },
  label: { fontSize: 13, fontWeight: '600', color: '#888', textTransform: 'uppercase', marginBottom: 8, marginTop: 16 },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 12, fontSize: 15, backgroundColor: '#fafafa', color: '#1a1a1a' },
  textArea: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 12, fontSize: 15, backgroundColor: '#fafafa', color: '#1a1a1a', minHeight: 80 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f5f5f5', borderWidth: 1, borderColor: '#e5e7eb' },
  pillActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  pillText: { fontSize: 14, color: '#333' },
  pillTextActive: { color: '#fff', fontWeight: '500' },
  attendeeList: { gap: 8 },
  attendeeItem: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 8, backgroundColor: '#f5f5f5', borderWidth: 1, borderColor: '#e5e7eb' },
  attendeeSelected: { backgroundColor: '#f0fdf4', borderColor: '#16a34a' },
  attendeeName: { fontSize: 14, color: '#333' },
  attendeeNameSelected: { color: '#16a34a', fontWeight: '500' },
  submitBtn: { backgroundColor: '#2563eb', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 32, marginBottom: 40 },
  submitBtnDisabled: { backgroundColor: '#93c5fd' },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '600' }
})