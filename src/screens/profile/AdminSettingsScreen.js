import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, FlatList } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc, updateDoc, addDoc, collection, query, where, onSnapshot, orderBy } from 'firebase/firestore'
import { auth, db } from '../../firebase.config'
import { ADMIN, SUPERVISOR, MEMBER, ROLES } from '../../constants/roles'
import { STATUS_PENDING, STATUS_APPROVED, STATUS_REJECTED } from '../../constants/statuses'
import { COL_ORGANIZATIONS, COL_USERS, COL_PROJECTS } from '../../constants/collections'
import { PLAN_CORE } from '../../constants/plans'

const DEFAULT_WORK_AREAS = ['Substation', 'BESS', 'Collection', 'TLine']
const DEFAULT_CATEGORIES = ['Engineering', 'Execution', 'Project Quality', 'Safety']

export default function AdminSettingsScreen() {
  const navigation = useNavigation()
  const [userRole, setUserRole] = useState(null)
  const [orgId, setOrgId] = useState(null)
  const [orgData, setOrgData] = useState(null)
  const [users, setUsers] = useState([])
  const [workAreas, setWorkAreas] = useState(DEFAULT_WORK_AREAS)
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES)
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState('')
  const [newWorkArea, setNewWorkArea] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [newProjectName, setNewProjectName] = useState('')

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDoc = await getDoc(doc(db, COL_USERS, user.uid))
        if (userDoc.exists()) {
          const data = userDoc.data()
          setUserRole(data.role)
          setOrgId(data.orgId)
          if (data.role === ADMIN) {
            const orgDoc = await getDoc(doc(db, COL_ORGANIZATIONS, data.orgId))
            if (orgDoc.exists()) {
              setOrgData({ id: orgDoc.id, ...orgDoc.data() })
              setWorkAreas(orgDoc.data().workAreas || DEFAULT_WORK_AREAS)
              setCategories(orgDoc.data().categories || DEFAULT_CATEGORIES)
            }
            onSnapshot(query(collection(db, COL_USERS), where('orgId', '==', data.orgId)), snap => setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
            onSnapshot(query(collection(db, COL_PROJECTS), where('orgId', '==', data.orgId), orderBy('createdAt', 'desc')), snap => setProjects(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
          }
        }
        setLoading(false)
      }
    })
    return () => unsubscribe()
  }, [])

  const updateOrg = async (updates) => {
    try {
      await updateDoc(doc(db, COL_ORGANIZATIONS, orgId), updates)
      setOrgData(prev => ({ ...prev, ...updates }))
    } catch (err) { Alert.alert('Error', err.message) }
  }

  const handleApprove = async (userId) => {
    try { await updateDoc(doc(db, COL_USERS, userId), { status: STATUS_APPROVED, updatedAt: new Date().toISOString() }) }
    catch (err) { Alert.alert('Error', err.message) }
  }

  const handleReject = async (userId) => {
    try { await updateDoc(doc(db, COL_USERS, userId), { status: STATUS_REJECTED, updatedAt: new Date().toISOString() }) }
    catch (err) { Alert.alert('Error', err.message) }
  }

  const handleChangeRole = async (userId, newRole) => {
    try { await updateDoc(doc(db, COL_USERS, userId), { role: newRole, updatedAt: new Date().toISOString() }) }
    catch (err) { Alert.alert('Error', err.message) }
  }

  const addWorkArea = () => {
    if (!newWorkArea.trim()) return
    const updated = [...workAreas, newWorkArea.trim()]
    setWorkAreas(updated)
    updateOrg({ workAreas: updated })
    setNewWorkArea('')
  }

  const removeWorkArea = (area) => {
    const updated = workAreas.filter(w => w !== area)
    setWorkAreas(updated)
    updateOrg({ workAreas: updated })
  }

  const addCategory = () => {
    if (!newCategory.trim()) return
    const updated = [...categories, newCategory.trim()]
    setCategories(updated)
    updateOrg({ categories: updated })
    setNewCategory('')
  }

  const removeCategory = (cat) => {
    const updated = categories.filter(c => c !== cat)
    setCategories(updated)
    updateOrg({ categories: updated })
  }

  const addProject = async () => {
    if (!newProjectName.trim()) return
    try {
      await addDoc(collection(db, COL_PROJECTS), {
        orgId, name: newProjectName.trim(), status: 'active',
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
      })
      setNewProjectName('')
      Alert.alert('Added', 'Project created.')
    } catch (err) { Alert.alert('Error', err.message) }
  }

  if (userRole !== ADMIN) {
    return <View style={styles.accessDenied}><Text style={styles.accessText}>Admin access required.</Text></View>
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Admin Settings</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Organization */}
        <Text style={styles.sectionLabel}>Organization</Text>
        <View style={styles.card}>
          <Text style={styles.orgName}>{orgData?.name || 'Loading...'}</Text>
          <Text style={styles.orgMeta}>Plan: {orgData?.plan || PLAN_CORE}</Text>
        </View>

        {/* User Management */}
        <Text style={styles.sectionLabel}>User Management ({users.length})</Text>
        {users.map(u => (
          <View key={u.id} style={styles.userRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.userName}>{u.name || 'Unknown'}</Text>
              <Text style={styles.userEmail}>{u.email}</Text>
              <View style={styles.userBadges}>
                <View style={[styles.roleBadgeSmall, { backgroundColor: u.role === ADMIN ? '#fef2f2' : '#eff6ff' }]}>
                  <Text style={[styles.roleTextSmall, { color: u.role === ADMIN ? '#dc2626' : '#2563eb' }]}>{u.role}</Text>
                </View>
                <View style={[styles.statusBadgeSmall, { backgroundColor: u.status === STATUS_APPROVED ? '#f0fdf4' : u.status === STATUS_REJECTED ? '#fef2f2' : '#fef3c7' }]}>
                  <Text style={[styles.statusTextSmall, { color: u.status === STATUS_APPROVED ? '#16a34a' : u.status === STATUS_REJECTED ? '#dc2626' : '#f59e0b' }]}>{u.status}</Text>
                </View>
              </View>
            </View>
            <View style={styles.userActions}>
              {u.status === STATUS_PENDING && (
                <>
                  <TouchableOpacity style={styles.approveBtn} onPress={() => handleApprove(u.id)}>
                    <Ionicons name="checkmark" size={16} color="#16a34a" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.rejectBtn} onPress={() => handleReject(u.id)}>
                    <Ionicons name="close" size={16} color="#dc2626" />
                  </TouchableOpacity>
                </>
              )}
              {ROLES.map(r => (
                <TouchableOpacity key={r} style={[styles.rolePill, u.role === r && styles.rolePillActive]}
                  onPress={() => handleChangeRole(u.id, r)}>
                  <Text style={[styles.rolePillText, u.role === r && styles.rolePillTextActive]}>{r}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Work Areas */}
        <Text style={styles.sectionLabel}>Work Areas</Text>
        <View style={styles.chipRow}>
          {workAreas.map(w => (
            <TouchableOpacity key={w} style={styles.chip} onPress={() => removeWorkArea(w)}>
              <Text style={styles.chipText}>{w}</Text>
              <Ionicons name="close-circle" size={16} color="#888" />
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.addRow}>
          <TextInput style={styles.addInput} placeholder="New work area" value={newWorkArea} onChangeText={setNewWorkArea} />
          <TouchableOpacity style={styles.addBtnSmall} onPress={addWorkArea}>
            <Ionicons name="add" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Categories */}
        <Text style={styles.sectionLabel}>Categories</Text>
        <View style={styles.chipRow}>
          {categories.map(c => (
            <TouchableOpacity key={c} style={styles.chip} onPress={() => removeCategory(c)}>
              <Text style={styles.chipText}>{c}</Text>
              <Ionicons name="close-circle" size={16} color="#888" />
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.addRow}>
          <TextInput style={styles.addInput} placeholder="New category" value={newCategory} onChangeText={setNewCategory} />
          <TouchableOpacity style={styles.addBtnSmall} onPress={addCategory}>
            <Ionicons name="add" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Projects */}
        <Text style={styles.sectionLabel}>Projects ({projects.length})</Text>
        {projects.map(p => (
          <View key={p.id} style={styles.projectRow}>
            <Text style={styles.projectName}>{p.name}</Text>
            <View style={[styles.projectBadge, { backgroundColor: p.status === 'active' ? '#f0fdf4' : '#f5f5f5' }]}>
              <Text style={[styles.projectStatus, { color: p.status === 'active' ? '#16a34a' : '#888' }]}>{p.status}</Text>
            </View>
          </View>
        ))}
        <View style={styles.addRow}>
          <TextInput style={styles.addInput} placeholder="New project name" value={newProjectName} onChangeText={setNewProjectName} />
          <TouchableOpacity style={styles.addBtnSmall} onPress={addProject}>
            <Ionicons name="add" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  accessDenied: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  accessText: { fontSize: 16, color: '#888' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 56, paddingHorizontal: 16, paddingBottom: 16, backgroundColor: '#fff' },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#1a1a1a' },
  scrollView: { flex: 1 },
  content: { padding: 20, paddingBottom: 100 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: '#888', textTransform: 'uppercase', marginTop: 24, marginBottom: 10 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#e5e7eb' },
  orgName: { fontSize: 18, fontWeight: '600', color: '#1a1a1a' },
  orgMeta: { fontSize: 14, color: '#666', marginTop: 4 },
  userRow: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#e5e7eb' },
  userName: { fontSize: 15, fontWeight: '600', color: '#1a1a1a' },
  userEmail: { fontSize: 13, color: '#888', marginTop: 2 },
  userBadges: { flexDirection: 'row', gap: 6, marginTop: 6 },
  roleBadgeSmall: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  roleTextSmall: { fontSize: 10, fontWeight: '600' },
  statusBadgeSmall: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  statusTextSmall: { fontSize: 10, fontWeight: '600' },
  userActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  approveBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#f0fdf4', justifyContent: 'center', alignItems: 'center' },
  rejectBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#fef2f2', justifyContent: 'center', alignItems: 'center' },
  rolePill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb' },
  rolePillActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  rolePillText: { fontSize: 10, color: '#888' },
  rolePillTextActive: { color: '#fff' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fff', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: '#e5e7eb' },
  chipText: { fontSize: 13, color: '#333' },
  addRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  addInput: { flex: 1, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 10, fontSize: 14, backgroundColor: '#fff' },
  addBtnSmall: { width: 40, height: 40, borderRadius: 8, backgroundColor: '#2563eb', justifyContent: 'center', alignItems: 'center' },
  projectRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', padding: 12, borderRadius: 10, marginBottom: 6, borderWidth: 1, borderColor: '#e5e7eb' },
  projectName: { fontSize: 14, fontWeight: '500', color: '#1a1a1a' },
  projectBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  projectStatus: { fontSize: 11, fontWeight: '500', textTransform: 'capitalize' }
})