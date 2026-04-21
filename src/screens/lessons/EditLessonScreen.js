import React, { useState, useEffect } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator
} from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc, updateDoc, addDoc, collection, onSnapshot, query, where, orderBy } from 'firebase/firestore'
import { auth, db } from '../../firebase.config'

const SEVERITY_OPTIONS = ['Low', 'Medium', 'High', 'Critical']
const SEVERITY_COLORS = { Low: '#3b82f6', Medium: '#f59e0b', High: '#f97316', Critical: '#dc2626' }
const CATEGORY_OPTIONS = ['Engineering', 'Execution', 'Project Quality', 'Safety']
const WORK_AREA_OPTIONS = ['Substation', 'BESS', 'Collection', 'TLine']

export default function EditLessonScreen() {
  const navigation = useNavigation()
  const route = useRoute()
  const { lessonId } = route.params

  const [user, setUser] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [userName, setUserName] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [projectId, setProjectId] = useState('')
  const [workArea, setWorkArea] = useState('')
  const [category, setCategory] = useState('')
  const [severity, setSeverity] = useState('Low')
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser)
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid))
        if (userDoc.exists()) {
          setUserRole(userDoc.data().role)
          setUserName(firebaseUser.displayName || userDoc.data().name || 'Unknown')

          // Load projects
          const q = query(collection(db, 'projects'), where('orgId', '==', userDoc.data().orgId), orderBy('createdAt', 'desc'))
          onSnapshot(q, (snap) => {
            setProjects(snap.docs.map(d => ({ id: d.id, ...d.data() })))
          })
        }
      }
    })
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    const load = async () => {
      const snap = await getDoc(doc(db, 'lessons', lessonId))
      if (snap.exists()) {
        const data = snap.data()
        setTitle(data.title || '')
        setDescription(data.description || '')
        setProjectId(data.projectId || '')
        setWorkArea(data.workArea || '')
        setCategory(data.category || '')
        setSeverity(data.severity || 'Low')
      }
      setLoading(false)
    }
    load()
  }, [lessonId])

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Required', 'Please enter a title')
      return
    }

    setSaving(true)
    try {
      await updateDoc(doc(db, 'lessons', lessonId), {
        title: title.trim(),
        description: description.trim(),
        category,
        workArea,
        severity,
        projectId: projectId || null,
        updatedAt: new Date().toISOString()
      })

      // Write activity feed
      await addDoc(collection(db, 'activityFeed'), {
        orgId: userRole,
        type: 'lesson_updated',
        lessonId,
        lessonTitle: title.trim(),
        userId: user.uid,
        userName,
        message: `Lesson updated by ${userName}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })

      Alert.alert('Saved', 'Lesson updated successfully', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ])
    } catch (err) {
      Alert.alert('Error', err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    )
  }

  if (userRole !== 'admin' && userRole !== 'supervisor') {
    return (
      <View style={styles.accessDenied}>
        <Ionicons name="lock-closed" size={48} color="#ccc" />
        <Text style={styles.accessTitle}>Access Denied</Text>
        <Text style={styles.accessSub}>Only admins and supervisors can edit lessons.</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Lesson</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Title */}
        <Text style={styles.label}>Title *</Text>
        <TextInput
          style={styles.input}
          placeholder="Brief lesson title"
          value={title}
          onChangeText={setTitle}
        />

        {/* Description */}
        <Text style={styles.label}>Description</Text>
        <TextInput
          style={styles.textArea}
          placeholder="Describe the lesson learned..."
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        {/* Project */}
        <Text style={styles.label}>Project</Text>
        <View style={styles.pillRow}>
          {projects.map(p => (
            <TouchableOpacity
              key={p.id}
              style={[styles.pill, projectId === p.id && styles.pillActive]}
              onPress={() => setProjectId(projectId === p.id ? '' : p.id)}
            >
              <Text style={[styles.pillText, projectId === p.id && styles.pillTextActive]}>
                {p.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Work Area */}
        <Text style={styles.label}>Work Area *</Text>
        <View style={styles.pillRow}>
          {WORK_AREA_OPTIONS.map(area => (
            <TouchableOpacity
              key={area}
              style={[styles.pill, workArea === area && styles.pillActive]}
              onPress={() => setWorkArea(workArea === area ? '' : area)}
            >
              <Text style={[styles.pillText, workArea === area && styles.pillTextActive]}>{area}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Category */}
        <Text style={styles.label}>Category *</Text>
        <View style={styles.pillRow}>
          {CATEGORY_OPTIONS.map(cat => (
            <TouchableOpacity
              key={cat}
              style={[styles.pill, category === cat && styles.pillActive]}
              onPress={() => setCategory(category === cat ? '' : cat)}
            >
              <Text style={[styles.pillText, category === cat && styles.pillTextActive]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Severity */}
        <Text style={styles.label}>Severity</Text>
        <View style={styles.pillRow}>
          {SEVERITY_OPTIONS.map(sev => (
            <TouchableOpacity
              key={sev}
              style={[
                styles.pill,
                severity === sev && { backgroundColor: SEVERITY_COLORS[sev], borderColor: SEVERITY_COLORS[sev] }
              ]}
              onPress={() => setSeverity(sev)}
            >
              <Text style={[styles.pillText, severity === sev && { color: '#fff' }]}>{sev}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.submitBtn, saving && styles.submitBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  accessDenied: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, backgroundColor: '#fff' },
  accessTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginTop: 16 },
  accessSub: { fontSize: 14, color: '#888', marginTop: 8, textAlign: 'center' },
  backButton: { marginTop: 24, backgroundColor: '#2563eb', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8 },
  backButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 56, paddingHorizontal: 16, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: '#eee'
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#1a1a1a' },
  scrollView: { flex: 1 },
  content: { padding: 20, paddingBottom: 100 },
  label: { fontSize: 13, fontWeight: '600', color: '#888', textTransform: 'uppercase', marginBottom: 8, marginTop: 16 },
  input: {
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8,
    padding: 12, fontSize: 15, backgroundColor: '#fafafa', color: '#1a1a1a'
  },
  textArea: {
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8,
    padding: 12, fontSize: 15, backgroundColor: '#fafafa', color: '#1a1a1a',
    minHeight: 100
  },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#f5f5f5', borderWidth: 1, borderColor: '#e5e7eb'
  },
  pillActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  pillText: { fontSize: 14, color: '#333' },
  pillTextActive: { color: '#fff', fontWeight: '500' },
  submitBtn: {
    backgroundColor: '#2563eb', padding: 16, borderRadius: 8,
    alignItems: 'center', marginTop: 32, marginBottom: 40
  },
  submitBtnDisabled: { backgroundColor: '#93c5fd' },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '600' }
})