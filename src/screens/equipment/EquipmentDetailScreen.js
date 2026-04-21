import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc, updateDoc, addDoc, collection, onSnapshot, query, where } from 'firebase/firestore'
import { auth, db } from '../../firebase.config'

const STATUS_COLORS = { available: '#16a34a', 'checked-out': '#f59e0b', maintenance: '#dc2626' }

export default function EquipmentDetailScreen({ navigation, route }) {
  const { equipmentId } = route.params
  const [equipment, setEquipment] = useState(null)
  const [userId, setUserId] = useState(null)
  const [users, setUsers] = useState([])
  const [projects, setProjects] = useState([])
  const [showCheckOut, setShowCheckOut] = useState(false)
  const [showCheckIn, setShowCheckIn] = useState(false)
  const [selectedUser, setSelectedUser] = useState('')
  const [selectedProject, setSelectedProject] = useState('')
  const [conditionNotes, setConditionNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid)
        const { getDoc, doc: docRef } = require('firebase/firestore')
        const userDoc = await getDoc(docRef(db, 'users', user.uid))
        if (userDoc.exists()) {
          const orgId = userDoc.data().orgId
          onSnapshot(query(collection(db, 'users'), where('orgId', '==', orgId)), snap => setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
          onSnapshot(query(collection(db, 'projects'), where('orgId', '==', orgId)), snap => setProjects(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
        }
      }
    })
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    const load = async () => {
      const snap = await getDoc(doc(db, 'equipment', equipmentId))
      if (snap.exists()) setEquipment({ id: snap.id, ...snap.data() })
      setLoading(false)
    }
    load()
  }, [equipmentId])

  const handleCheckOut = async () => {
    if (!selectedUser) { Alert.alert('Required', 'Select a user'); return }
    if (!selectedProject) { Alert.alert('Required', 'Select a project'); return }
    setSaving(true)
    try {
      await updateDoc(doc(db, 'equipment', equipmentId), {
        status: 'checked-out',
        assignedTo: selectedUser,
        assignedToName: users.find(u => u.id === selectedUser)?.name || '',
        assignedProject: projects.find(p => p.id === selectedProject)?.name || '',
        checkedOutAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      const snap = await getDoc(doc(db, 'equipment', equipmentId))
      setEquipment({ id: snap.id, ...snap.data() })
      setShowCheckOut(false)
      Alert.alert('Checked Out', 'Equipment assigned successfully.')
    } catch (err) { Alert.alert('Error', err.message) }
    finally { setSaving(false) }
  }

  const handleCheckIn = async () => {
    setSaving(true)
    try {
      await updateDoc(doc(db, 'equipment', equipmentId), {
        status: 'available',
        assignedTo: null,
        assignedToName: null,
        assignedProject: null,
        conditionNotes: conditionNotes.trim() || null,
        checkedInAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      const snap = await getDoc(doc(db, 'equipment', equipmentId))
      setEquipment({ id: snap.id, ...snap.data() })
      setShowCheckIn(false)
      setConditionNotes('')
      Alert.alert('Checked In', 'Equipment is now available.')
    } catch (err) { Alert.alert('Error', err.message) }
    finally { setSaving(false) }
  }

  if (loading) return <View style={styles.loading}><ActivityIndicator size="large" color="#2563eb" /></View>
  if (!equipment) return <View style={styles.loading}><Text>Equipment not found</Text></View>

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Equipment Detail</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.eqName}>{equipment.name}</Text>
        <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLORS[equipment.status] || '#888') + '20' }]}>
          <Text style={[styles.statusText, { color: STATUS_COLORS[equipment.status] || '#888' }]}>
            {equipment.status || 'available'}
          </Text>
        </View>

        <View style={styles.detailCard}>
          {equipment.type && <View style={styles.detailRow}><Text style={styles.detailLabel}>Type</Text><Text style={styles.detailValue}>{equipment.type}</Text></View>}
          {equipment.identifier && <View style={styles.detailRow}><Text style={styles.detailLabel}>Identifier</Text><Text style={styles.detailValue}>{equipment.identifier}</Text></View>}
          {equipment.assignedToName && <View style={styles.detailRow}><Text style={styles.detailLabel}>Assigned To</Text><Text style={styles.detailValue}>{equipment.assignedToName}</Text></View>}
          {equipment.assignedProject && <View style={styles.detailRow}><Text style={styles.detailLabel}>Project</Text><Text style={styles.detailValue}>{equipment.assignedProject}</Text></View>}
          {equipment.conditionNotes && <View style={styles.detailRow}><Text style={styles.detailLabel}>Condition Notes</Text><Text style={styles.detailValue}>{equipment.conditionNotes}</Text></View>}
        </View>

        {equipment.status === 'available' && (
          <TouchableOpacity style={styles.checkOutBtn} onPress={() => setShowCheckOut(true)}>
            <Text style={styles.checkOutText}>Check Out</Text>
          </TouchableOpacity>
        )}

        {equipment.status === 'checked-out' && (
          <TouchableOpacity style={styles.checkInBtn} onPress={() => setShowCheckIn(true)}>
            <Text style={styles.checkInText}>Check In</Text>
          </TouchableOpacity>
        )}

        {showCheckOut && (
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>Check Out Equipment</Text>
            <Text style={styles.label}>Select User</Text>
            <View style={styles.pillRow}>
              {users.map(u => (
                <TouchableOpacity key={u.id} style={[styles.pill, selectedUser === u.id && styles.pillActive]}
                  onPress={() => setSelectedUser(selectedUser === u.id ? '' : u.id)}>
                  <Text style={[styles.pillText, selectedUser === u.id && styles.pillTextActive]}>{u.name || u.email}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.label}>Select Project</Text>
            <View style={styles.pillRow}>
              {projects.map(p => (
                <TouchableOpacity key={p.id} style={[styles.pill, selectedProject === p.id && styles.pillActive]}
                  onPress={() => setSelectedProject(selectedProject === p.id ? '' : p.id)}>
                  <Text style={[styles.pillText, selectedProject === p.id && styles.pillTextActive]}>{p.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.dialogActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowCheckOut(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.confirmBtn, saving && styles.btnDisabled]}
                onPress={handleCheckOut} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmText}>Confirm</Text>}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {showCheckIn && (
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>Check In Equipment</Text>
            <Text style={styles.label}>Condition Notes (optional)</Text>
            <TextInput style={styles.input} placeholder="Any notes about condition..."
              value={conditionNotes} onChangeText={setConditionNotes} multiline />
            <View style={styles.dialogActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowCheckIn(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.confirmBtn, saving && styles.btnDisabled]}
                onPress={handleCheckIn} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmText}>Confirm</Text>}
              </TouchableOpacity>
            </View>
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
  eqName: { fontSize: 24, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 12 },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, marginBottom: 20 },
  statusText: { fontSize: 13, fontWeight: '600' },
  detailCard: { backgroundColor: '#f5f5f5', borderRadius: 12, padding: 16, marginBottom: 20, gap: 10 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between' },
  detailLabel: { fontSize: 13, color: '#888' },
  detailValue: { fontSize: 14, color: '#333', fontWeight: '500', maxWidth: '60%', textAlign: 'right' },
  checkOutBtn: { backgroundColor: '#f59e0b', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  checkOutText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  checkInBtn: { backgroundColor: '#16a34a', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  checkInText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  dialog: { backgroundColor: '#f9f9f9', borderRadius: 12, padding: 20, marginTop: 16, borderWidth: 1, borderColor: '#e5e7eb' },
  dialogTitle: { fontSize: 16, fontWeight: '600', color: '#1a1a1a', marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#888', textTransform: 'uppercase', marginBottom: 8, marginTop: 8 },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 12, fontSize: 15, backgroundColor: '#fff', color: '#1a1a1a', minHeight: 60 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  pill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb' },
  pillActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  pillText: { fontSize: 14, color: '#333' },
  pillTextActive: { color: '#fff', fontWeight: '500' },
  dialogActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 16 },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: 20 },
  cancelText: { color: '#666', fontSize: 14 },
  confirmBtn: { backgroundColor: '#2563eb', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
  confirmText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  btnDisabled: { backgroundColor: '#93c5fd' }
})