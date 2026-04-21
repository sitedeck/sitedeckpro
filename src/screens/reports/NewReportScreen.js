import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import * as Speech from 'expo-speech'
import { onAuthStateChanged } from 'firebase/auth'
import { addDoc, collection, onSnapshot, query, where, orderBy } from 'firebase/firestore'
import { auth, db } from '../../firebase.config'

export default function NewReportScreen() {
  const navigation = useNavigation()
  const [orgId, setOrgId] = useState(null)
  const [userId, setUserId] = useState(null)
  const [userName, setUserName] = useState('')
  const [projects, setProjects] = useState([])
  const [selectedProject, setSelectedProject] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [crewOnSite, setCrewOnSite] = useState('')
  const [workCompleted, setWorkCompleted] = useState('')
  const [equipmentUsed, setEquipmentUsed] = useState('')
  const [weather, setWeather] = useState('')
  const [delays, setDelays] = useState('')
  const [notes, setNotes] = useState('')
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
          const q = query(collection(db, 'projects'), where('orgId', '==', userDoc.data().orgId), orderBy('createdAt', 'desc'))
          onSnapshot(q, snap => setProjects(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
        }
      }
    })
    return () => unsubscribe()
  }, [])

  const voiceInput = (setter) => {
    Alert.alert('Voice Input', 'Type your notes or tap OK to use voice.', [
      { text: 'OK', onPress: () => setter(prev => prev + ' (voice noted)') }
    ])
  }

  const handleSubmit = async () => {
    if (!selectedProject) { Alert.alert('Required', 'Please select a project'); return }
    if (!crewOnSite) { Alert.alert('Required', 'Please enter crew count'); return }

    setSaving(true)
    try {
      const createdAt = new Date().toISOString()
      await addDoc(collection(db, 'dailyReports'), {
        orgId,
        projectId: selectedProject,
        projectName: projects.find(p => p.id === selectedProject)?.name || '',
        date,
        crewOnSite: parseInt(crewOnSite) || 0,
        workCompleted: workCompleted.trim(),
        equipmentUsed: equipmentUsed.trim(),
        weather: weather.trim(),
        delays: delays.trim(),
        notes: notes.trim(),
        submittedBy: userId,
        submittedByName: userName,
        locked: false,
        createdAt,
        updatedAt: createdAt
      })
      Alert.alert('Saved', 'Daily report submitted.', [{ text: 'OK', onPress: () => navigation.goBack() }])
    } catch (err) { Alert.alert('Error', err.message) }
    finally { setSaving(false) }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Daily Report</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.label}>Project *</Text>
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

        <Text style={styles.label}>Crew on Site *</Text>
        <TextInput style={styles.input} placeholder="Number of crew members" value={crewOnSite}
          onChangeText={setCrewOnSite} keyboardType="numeric" />

        <Text style={styles.label}>Work Completed</Text>
        <View style={styles.voiceRow}>
          <TextInput style={[styles.input, { flex: 1 }]} placeholder="What was completed..." value={workCompleted}
            onChangeText={setWorkCompleted} multiline numberOfLines={2} />
          <TouchableOpacity style={styles.voiceBtn} onPress={() => voiceInput(setWorkCompleted)}>
            <Ionicons name="mic-outline" size={20} color="#2563eb" />
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Equipment Used</Text>
        <TextInput style={styles.input} placeholder="Equipment on site..." value={equipmentUsed}
          onChangeText={setEquipmentUsed} />

        <Text style={styles.label}>Weather Conditions</Text>
        <TextInput style={styles.input} placeholder="Weather today..." value={weather}
          onChangeText={setWeather} />

        <Text style={styles.label}>Delays or Issues</Text>
        <TextInput style={styles.input} placeholder="Any delays or issues..." value={delays}
          onChangeText={setDelays} />

        <Text style={styles.label}>Additional Notes</Text>
        <TextInput style={styles.textArea} placeholder="Any other notes..." value={notes}
          onChangeText={setNotes} multiline numberOfLines={3} textAlignVertical="top" />

        <TouchableOpacity style={[styles.submitBtn, saving && styles.submitBtnDisabled]}
          onPress={handleSubmit} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Submit Report</Text>}
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
  voiceRow: { flexDirection: 'row', gap: 8 },
  voiceBtn: { width: 48, height: 48, borderRadius: 8, backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb' },
  submitBtn: { backgroundColor: '#2563eb', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 32, marginBottom: 40 },
  submitBtnDisabled: { backgroundColor: '#93c5fd' },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '600' }
})