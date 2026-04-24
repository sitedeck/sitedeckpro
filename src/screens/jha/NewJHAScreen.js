import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import * as Speech from 'expo-speech'
import { onAuthStateChanged } from 'firebase/auth'
import { addDoc, collection, onSnapshot, query, where, orderBy } from 'firebase/firestore'
import { auth, db } from '../../firebase.config'
import { COL_JHA, COL_PROJECTS } from '../../constants/collections'
import { JHA_DRAFT } from '../../constants/statuses'

const RISK_LEVELS = ['Low', 'Medium', 'High']
const PPE_OPTIONS = ['Hard Hat', 'Safety Glasses', 'Gloves', 'High-Vis Vest', 'Fall Protection', 'Respirator', 'Face Shield', 'Other']
const RISK_COLORS = { Low: '#3b82f6', Medium: '#f59e0b', High: '#dc2626' }

export default function NewJHAScreen() {
  const navigation = useNavigation()
  const [orgId, setOrgId] = useState(null)
  const [userId, setUserId] = useState(null)
  const [userName, setUserName] = useState('')
  const [projects, setProjects] = useState([])
  const [selectedProject, setSelectedProject] = useState('')
  const [workDescription, setWorkDescription] = useState('')
  const [location, setLocation] = useState('')
  const [hazards, setHazards] = useState([{ description: '', riskLevel: 'Medium', mitigation: '' }])
  const [ppeList, setPpeList] = useState(PPE_OPTIONS.map(p => ({ name: p, checked: false })))
  const [crewSignoffs, setCrewSignoffs] = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid)
        const { getDoc, doc } = require('firebase/firestore')
        const userDoc = await getDoc(doc(db, COL_USERS, user.uid))
        if (userDoc.exists()) {
          setOrgId(userDoc.data().orgId)
          setUserName(user.displayName || userDoc.data().name || 'Unknown')
          const q = query(collection(db, COL_PROJECTS), where('orgId', '==', userDoc.data().orgId), orderBy('createdAt', 'desc'))
          onSnapshot(q, snap => setProjects(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
        }
      }
    })
    return () => unsubscribe()
  }, [])

  const togglePPE = (idx) => setPpeList(ppeList.map((p, i) => i === idx ? { ...p, checked: !p.checked } : p))

  const addHazard = () => setHazards([...hazards, { description: '', riskLevel: 'Medium', mitigation: '' }])

  const updateHazard = (idx, field, val) => setHazards(hazards.map((h, i) => i === idx ? { ...h, [field]: val } : h))

  const removeHazard = (idx) => setHazards(hazards.filter((_, i) => i !== idx))

  const handleSubmit = async () => {
    if (!workDescription.trim()) { Alert.alert('Required', 'Work description is required'); return }
    if (hazards.some(h => !h.description.trim())) { Alert.alert('Required', 'All hazards must have a description'); return }

    setSaving(true)
    try {
      await addDoc(collection(db, COL_JHA), {
        orgId,
        projectId: selectedProject || null,
        description: workDescription.trim(),
        location: location.trim(),
        hazards,
        ppeList: ppeList.filter(p => p.checked).map(p => p.name),
        crewSignoffs: [],
        createdBy: userId,
        createdByName: userName,
        status: JHA_DRAFT,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      Alert.alert('Saved', 'JHA created as draft', [{ text: 'OK', onPress: () => navigation.goBack() }])
    } catch (err) { Alert.alert('Error', err.message) }
    finally { setSaving(false) }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New JHA</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.label}>Project</Text>
        <View style={styles.pillRow}>
          {projects.map(p => (
            <TouchableOpacity key={p.id} style={[styles.pill, selectedProject === p.id && styles.pillActive]}
              onPress={() => setSelectedProject(selectedProject === p.id ? '' : p.id)}>
              <Text style={[styles.pillText, selectedProject === p.id && styles.pillTextActive]}>{p.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Work Description *</Text>
        <TextInput style={styles.textArea} placeholder="Describe the work being performed..." value={workDescription}
          onChangeText={setWorkDescription} multiline numberOfLines={3} textAlignVertical="top" />

        <Text style={styles.label}>Location</Text>
        <TextInput style={styles.input} placeholder="Work location" value={location} onChangeText={setLocation} />

        <Text style={styles.label}>Hazards</Text>
        {hazards.map((h, idx) => (
          <View key={idx} style={styles.hazardCard}>
            <View style={styles.hazardHeader}>
              <Text style={styles.hazardNum}>Hazard {idx + 1}</Text>
              {hazards.length > 1 && <TouchableOpacity onPress={() => removeHazard(idx)}>
                <Ionicons name="trash-outline" size={18} color="#dc2626" />
              </TouchableOpacity>}
            </View>
            <TextInput style={styles.input} placeholder="Hazard description" value={h.description}
              onChangeText={v => updateHazard(idx, 'description', v)} />
            <View style={styles.riskRow}>
              <Text style={styles.riskLabel}>Risk Level:</Text>
              {RISK_LEVELS.map(r => (
                <TouchableOpacity key={r} style={[styles.riskPill, h.riskLevel === r && { backgroundColor: RISK_COLORS[r], borderColor: RISK_COLORS[r] }]}
                  onPress={() => updateHazard(idx, 'riskLevel', r)}>
                  <Text style={[styles.riskText, h.riskLevel === r && { color: '#fff' }]}>{r}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput style={styles.input} placeholder="Mitigation / Control" value={h.mitigation}
              onChangeText={v => updateHazard(idx, 'mitigation', v)} />
          </View>
        ))}
        <TouchableOpacity style={styles.addHazardBtn} onPress={addHazard}>
          <Ionicons name="add" size={18} color="#2563eb" />
          <Text style={styles.addHazardText}>Add Hazard</Text>
        </TouchableOpacity>

        <Text style={styles.label}>PPE Required</Text>
        <View style={styles.ppeGrid}>
          {ppeList.map((p, idx) => (
            <TouchableOpacity key={idx} style={[styles.ppeItem, p.checked && styles.ppeChecked]}
              onPress={() => togglePPE(idx)}>
              <Ionicons name={p.checked ? 'checkbox' : 'square-outline'} size={20}
                color={p.checked ? '#16a34a' : '#888'} />
              <Text style={[styles.ppeText, p.checked && styles.ppeTextChecked]}>{p.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={[styles.submitBtn, saving && styles.submitBtnDisabled]} onPress={handleSubmit} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Submit for Approval</Text>}
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
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 12, fontSize: 15, backgroundColor: '#fafafa', color: '#1a1a1a', marginBottom: 8 },
  textArea: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 12, fontSize: 15, backgroundColor: '#fafafa', color: '#1a1a1a', minHeight: 80 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f5f5f5', borderWidth: 1, borderColor: '#e5e7eb' },
  pillActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  pillText: { fontSize: 14, color: '#333' },
  pillTextActive: { color: '#fff', fontWeight: '500' },
  hazardCard: { backgroundColor: '#f5f5f5', borderRadius: 12, padding: 16, marginBottom: 12 },
  hazardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  hazardNum: { fontSize: 14, fontWeight: '600', color: '#333' },
  riskRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  riskLabel: { fontSize: 13, color: '#666' },
  riskPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: '#ddd' },
  riskText: { fontSize: 12, color: '#666' },
  addHazardBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 8 },
  addHazardText: { fontSize: 14, color: '#2563eb', fontWeight: '500' },
  ppeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  ppeItem: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: '#f5f5f5', borderWidth: 1, borderColor: '#e5e7eb', width: '48%' },
  ppeChecked: { backgroundColor: '#f0fdf4', borderColor: '#16a34a' },
  ppeText: { fontSize: 13, color: '#666' },
  ppeTextChecked: { color: '#16a34a', fontWeight: '500' },
  submitBtn: { backgroundColor: '#2563eb', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 32, marginBottom: 40 },
  submitBtnDisabled: { backgroundColor: '#93c5fd' },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '600' }
})