import React, { useState, useEffect, useRef } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator, FlatList } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { onAuthStateChanged } from 'firebase/auth'
import { addDoc, collection, onSnapshot, query, where, orderBy, updateDoc, doc } from 'firebase/firestore'
import { auth, db } from '../../firebase.config'

const STATUS_COLORS = { pending: '#f59e0b', approved: '#16a34a', rejected: '#dc2626' }

export default function TimesheetScreen() {
  const navigation = useNavigation()
  const [userId, setUserId] = useState(null)
  const [orgId, setOrgId] = useState(null)
  const [activeClock, setActiveClock] = useState(null)
  const [elapsed, setElapsed] = useState(0)
  const [projects, setProjects] = useState([])
  const [workType, setWorkType] = useState('')
  const [selectedProject, setSelectedProject] = useState('')
  const [timesheets, setTimesheets] = useState([])
  const [loading, setLoading] = useState(true)
  const timerRef = useRef(null)
  const [clockingOut, setClockingOut] = useState(false)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid)
        const { getDoc, doc: docRef } = require('firebase/firestore')
        const userDoc = await getDoc(docRef(db, 'users', user.uid))
        if (userDoc.exists()) {
          setOrgId(userDoc.data().orgId)
          const projQ = query(collection(db, 'projects'), where('orgId', '==', userDoc.data().orgId))
          onSnapshot(projQ, snap => setProjects(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
        }
        const tsQ = query(collection(db, 'timesheets'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'))
        onSnapshot(tsQ, snap => {
          setTimesheets(snap.docs.map(d => ({ id: d.id, ...d.data() })))
          const active = snap.docs.find(d => d.data().status === 'clocked_in')
          setActiveClock(active ? { id: active.id, ...active.data() } : null)
          setLoading(false)
        })
      }
    })
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    if (activeClock) {
      const start = new Date(activeClock.clockIn).getTime()
      timerRef.current = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
      setElapsed(0)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [activeClock])

  const formatElapsed = (s) => {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = s % 60
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
  }

  const formatTime = (iso) => new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

  const handleClockIn = async () => {
    try {
      const docRef = await addDoc(collection(db, 'timesheets'), {
        userId, orgId,
        clockIn: new Date().toISOString(),
        status: 'clocked_in',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
    } catch (err) { Alert.alert('Error', err.message) }
  }

  const handleClockOut = async () => {
    if (!workType.trim()) { Alert.alert('Required', 'Please enter a work type'); return }
    if (!selectedProject) { Alert.alert('Required', 'Please select a project'); return }
    setClockingOut(true)
    try {
      const clockInTime = new Date(activeClock.clockIn).getTime()
      const clockOutTime = Date.now()
      const hoursWorked = (clockOutTime - clockInTime) / 3600000
      await updateDoc(doc(db, 'timesheets', activeClock.id), {
        clockOut: new Date().toISOString(),
        hoursWorked: Math.round(hoursWorked * 100) / 100,
        workType: workType.trim(),
        projectId: selectedProject,
        projectName: projects.find(p => p.id === selectedProject)?.name || '',
        status: 'pending',
        updatedAt: new Date().toISOString()
      })
      setActiveClock(null)
      setWorkType('')
      setSelectedProject('')
      Alert.alert('Clocked Out', `Hours worked: ${hoursWorked.toFixed(2)}`)
    } catch (err) { Alert.alert('Error', err.message) }
    finally { setClockingOut(false) }
  }

  const formatDate = (iso) => {
    if (!iso) return ''
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Timesheet</Text>
        <TouchableOpacity onPress={() => navigation.navigate('TimesheetHistory')}>
          <Ionicons name="time-outline" size={24} color="#2563eb" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 40 }} />
      ) : (
        <>
          {/* Clock Display */}
          <View style={styles.clockCard}>
            <Text style={styles.clockTime}>{formatElapsed(elapsed)}</Text>
            <Text style={styles.clockLabel}>{activeClock ? 'Clocked In' : 'Not Clocked In'}</Text>
          </View>

          {/* Clock Buttons */}
          {!activeClock ? (
            <TouchableOpacity style={styles.clockInBtn} onPress={handleClockIn}>
              <Ionicons name="play-circle" size={28} color="#fff" />
              <Text style={styles.clockInText}>Clock In</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.clockOutSection}>
              <Text style={styles.clockOutLabel}>Clock Out</Text>
              <TextInput style={styles.input} placeholder="Work type (e.g. Electrical, Framing)"
                value={workType} onChangeText={setWorkType} />
              <View style={styles.pillRow}>
                {projects.map(p => (
                  <TouchableOpacity key={p.id} style={[styles.pill, selectedProject === p.id && styles.pillActive]}
                    onPress={() => setSelectedProject(selectedProject === p.id ? '' : p.id)}>
                    <Text style={[styles.pillText, selectedProject === p.id && styles.pillTextActive]}>{p.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity style={[styles.clockOutBtn, clockingOut && styles.btnDisabled]}
                onPress={handleClockOut} disabled={clockingOut}>
                {clockingOut ? <ActivityIndicator color="#fff" /> : <Text style={styles.clockOutText}>Clock Out</Text>}
              </TouchableOpacity>
            </View>
          )}

          {/* Recent Timesheets */}
          <Text style={styles.sectionLabel}>Recent</Text>
          {timesheets.slice(0, 5).map(ts => (
            <View key={ts.id} style={styles.historyItem}>
              <View style={styles.historyLeft}>
                <Text style={styles.historyDate}>{formatDate(ts.clockIn)}</Text>
                <Text style={styles.historyProject}>{ts.projectName || 'No project'}</Text>
              </View>
              <View style={styles.historyRight}>
                <Text style={styles.historyHours}>{ts.hoursWorked ? `${ts.hoursWorked}h` : '--'}</Text>
                <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLORS[ts.status] || '#888') + '20' }]}>
                  <Text style={[styles.statusText, { color: STATUS_COLORS[ts.status] || '#888' }]}>{ts.status || 'pending'}</Text>
                </View>
              </View>
            </View>
          ))}
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', paddingHorizontal: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 56, paddingBottom: 16 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#1a1a1a' },
  clockCard: { backgroundColor: '#fff', borderRadius: 20, padding: 32, alignItems: 'center', marginTop: 16, borderWidth: 1, borderColor: '#e5e7eb' },
  clockTime: { fontSize: 56, fontWeight: '200', color: '#1a1a1a', fontVariant: ['tabular-nums'] },
  clockLabel: { fontSize: 16, color: '#888', marginTop: 8 },
  clockInBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#16a34a', padding: 20, borderRadius: 12, marginTop: 20 },
  clockInText: { color: '#fff', fontSize: 20, fontWeight: '600' },
  clockOutSection: { marginTop: 20 },
  clockOutLabel: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 12 },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 12, fontSize: 15, backgroundColor: '#fff', color: '#1a1a1a', marginBottom: 12 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  pill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb' },
  pillActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  pillText: { fontSize: 14, color: '#333' },
  pillTextActive: { color: '#fff', fontWeight: '500' },
  clockOutBtn: { backgroundColor: '#dc2626', padding: 18, borderRadius: 12, alignItems: 'center' },
  btnDisabled: { backgroundColor: '#fca5a5' },
  clockOutText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: '#888', textTransform: 'uppercase', marginTop: 28, marginBottom: 12 },
  historyItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 14, borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: '#e5e7eb' },
  historyLeft: {},
  historyDate: { fontSize: 14, fontWeight: '600', color: '#1a1a1a' },
  historyProject: { fontSize: 13, color: '#888', marginTop: 2 },
  historyRight: { alignItems: 'flex-end' },
  historyHours: { fontSize: 16, fontWeight: '600', color: '#333' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginTop: 4 },
  statusText: { fontSize: 11, fontWeight: '600' }
})