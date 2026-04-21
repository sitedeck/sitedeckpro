import React, { useState, useEffect } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator
} from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc, updateDoc, addDoc, collection } from 'firebase/firestore'
import { auth, db } from '../../firebase.config'

const SEVERITY_COLORS = { Low: '#3b82f6', Medium: '#f59e0b', High: '#f97316', Critical: '#dc2626' }
const STATUS_COLORS = { Open: '#dc2626', Reviewed: '#2563eb', Closed: '#16a34a' }
const STATUS_OPTIONS = ['Open', 'Reviewed', 'Closed']

export default function LessonDetailScreen() {
  const navigation = useNavigation()
  const route = useRoute()
  const { lessonId } = route.params

  const [lesson, setLesson] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [userId, setUserId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showReviewNotes, setShowReviewNotes] = useState(false)
  const [showCloseNotes, setShowCloseNotes] = useState(false)
  const [reviewNotes, setReviewNotes] = useState('')
  const [closeNotes, setCloseNotes] = useState('')
  const [statusUpdating, setStatusUpdating] = useState(false)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUserId(firebaseUser.uid)
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid))
        if (userDoc.exists()) setUserRole(userDoc.data().role)
      }
    })
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    const load = async () => {
      const snap = await getDoc(doc(db, 'lessons', lessonId))
      if (snap.exists()) {
        setLesson({ id: snap.id, ...snap.data() })
      }
      setLoading(false)
    }
    load()
  }, [lessonId])

  const formatDate = (iso) => {
    if (!iso) return ''
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
    })
  }

  const handleStatusUpdate = async (newStatus) => {
    if (lesson.status === newStatus) return

    let notes = ''
    if (newStatus === 'Reviewed') {
      if (!reviewNotes.trim()) {
        Alert.alert('Required', 'Please enter review notes before marking as Reviewed.')
        return
      }
      notes = reviewNotes
    } else if (newStatus === 'Closed') {
      if (!closeNotes.trim()) {
        Alert.alert('Required', 'Please enter close out notes before marking as Closed.')
        return
      }
      notes = closeNotes
    }

    setStatusUpdating(true)
    try {
      await updateDoc(doc(db, 'lessons', lessonId), {
        status: newStatus,
        notes: notes || lesson.notes || '',
        updatedAt: new Date().toISOString()
      })

      // Write activity feed
      await addDoc(collection(db, 'activityFeed'), {
        orgId: lesson.orgId,
        type: 'lesson_status_changed',
        lessonId,
        lessonTitle: lesson.title,
        userId,
        userName: lesson.createdByName || 'Unknown',
        message: `Lesson marked ${newStatus} by ${lesson.createdByName || 'Unknown'}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })

      // Refresh
      const updated = await getDoc(doc(db, 'lessons', lessonId))
      setLesson({ id: updated.id, ...updated.data() })
      setShowReviewNotes(false)
      setShowCloseNotes(false)
      setReviewNotes('')
      setCloseNotes('')
    } catch (err) {
      Alert.alert('Error', err.message)
    } finally {
      setStatusUpdating(false)
    }
  }

  const canEdit = userRole === 'admin' || userRole === 'supervisor'

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    )
  }

  if (!lesson) {
    return (
      <View style={styles.loading}>
        <Text>Lesson not found</Text>
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
        <Text style={styles.headerTitle}>Lesson Detail</Text>
        {canEdit && (
          <TouchableOpacity
            onPress={() => navigation.navigate('EditLesson', { lessonId })}
            style={styles.editBtn}
          >
            <Ionicons name="create-outline" size={22} color="#2563eb" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Title & Badges */}
        <Text style={styles.title}>{lesson.title}</Text>
        <View style={styles.badgeRow}>
          <View style={[styles.badge, { backgroundColor: SEVERITY_COLORS[lesson.severity] || '#888' }]}>
            <Text style={styles.badgeText}>{lesson.severity || 'Low'}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: (STATUS_COLORS[lesson.status] || '#888') + '20' }]}>
            <Text style={[styles.statusBadgeText, { color: STATUS_COLORS[lesson.status] || '#888' }]}>
              {lesson.status || 'Open'}
            </Text>
          </View>
        </View>

        {/* Category & Work Area */}
        <View style={styles.metaRow}>
          <View style={styles.metaPill}>
            <View style={[styles.dot, { backgroundColor: '#9333ea' }]} />
            <Text style={styles.metaText}>{lesson.category || 'General'}</Text>
          </View>
          <View style={styles.metaPill}>
            <View style={[styles.dot, { backgroundColor: '#0891b2' }]} />
            <Text style={styles.metaText}>{lesson.workArea || 'General'}</Text>
          </View>
        </View>

        {/* Description */}
        {lesson.description && (
          <>
            <Text style={styles.sectionLabel}>Description</Text>
            <Text style={styles.description}>{lesson.description}</Text>
          </>
        )}

        {/* Meta Card */}
        <View style={styles.metaCard}>
          <View style={styles.metaRowInner}>
            <Text style={styles.metaLabel}>Created By</Text>
            <Text style={styles.metaValue}>{lesson.createdByName || 'Unknown'}</Text>
          </View>
          <View style={styles.metaRowInner}>
            <Text style={styles.metaLabel}>Created Date</Text>
            <Text style={styles.metaValue}>{formatDate(lesson.createdAt)}</Text>
          </View>
          {lesson.projectId && (
            <View style={styles.metaRowInner}>
              <Text style={styles.metaLabel}>Project</Text>
              <Text style={styles.metaValue}>{lesson.projectId}</Text>
            </View>
          )}
          <View style={styles.metaRowInner}>
            <Text style={styles.metaLabel}>Lesson ID</Text>
            <Text style={styles.metaValue}>{lesson.id}</Text>
          </View>
          {lesson.notes && (
            <View style={styles.metaRowInner}>
              <Text style={styles.metaLabel}>Notes</Text>
              <Text style={styles.metaValue}>{lesson.notes}</Text>
            </View>
          )}
        </View>

        {/* Status Update Section */}
        <Text style={styles.sectionLabel}>Update Status</Text>
        <View style={styles.statusButtons}>
          {STATUS_OPTIONS.map(st => (
            <TouchableOpacity
              key={st}
              style={[
                styles.statusBtn,
                { borderColor: STATUS_COLORS[st], backgroundColor: lesson.status === st ? STATUS_COLORS[st] : 'transparent' }
              ]}
              onPress={() => {
                if (lesson.status === st) return
                if (st === 'Reviewed') setShowReviewNotes(true)
                else if (st === 'Closed') setShowCloseNotes(true)
                else handleStatusUpdate(st)
              }}
              disabled={statusUpdating}
            >
              <Text style={[styles.statusBtnText, { color: lesson.status === st ? '#fff' : STATUS_COLORS[st] }]}>
                {st}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {showReviewNotes && (
          <View style={styles.notesSection}>
            <Text style={styles.notesLabel}>Review Notes *</Text>
            <TextInput
              style={styles.notesInput}
              placeholder="Enter review notes..."
              value={reviewNotes}
              onChangeText={setReviewNotes}
              multiline
              numberOfLines={3}
            />
            <View style={styles.notesActions}>
              <TouchableOpacity
                style={styles.notesCancel}
                onPress={() => { setShowReviewNotes(false); setReviewNotes('') }}
              >
                <Text style={styles.notesCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.notesSave, { backgroundColor: STATUS_COLORS.Reviewed }]}
                onPress={() => handleStatusUpdate('Reviewed')}
                disabled={statusUpdating}
              >
                <Text style={styles.notesSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {showCloseNotes && (
          <View style={styles.notesSection}>
            <Text style={styles.notesLabel}>Close Out Notes *</Text>
            <TextInput
              style={styles.notesInput}
              placeholder="Enter close out notes..."
              value={closeNotes}
              onChangeText={setCloseNotes}
              multiline
              numberOfLines={3}
            />
            <View style={styles.notesActions}>
              <TouchableOpacity
                style={styles.notesCancel}
                onPress={() => { setShowCloseNotes(false); setCloseNotes('') }}
              >
                <Text style={styles.notesCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.notesSave, { backgroundColor: STATUS_COLORS.Closed }]}
                onPress={() => handleStatusUpdate('Closed')}
                disabled={statusUpdating}
              >
                <Text style={styles.notesSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 56, paddingHorizontal: 16, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: '#eee'
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#1a1a1a' },
  editBtn: { padding: 4 },
  scrollView: { flex: 1 },
  content: { padding: 20 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 12 },
  badgeRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  statusBadgeText: { fontSize: 12, fontWeight: '600' },
  metaRow: { flexDirection: 'row', gap: 16, marginBottom: 20 },
  metaPill: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  metaText: { fontSize: 14, color: '#666' },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: '#888', textTransform: 'uppercase', marginBottom: 8, marginTop: 8 },
  description: { fontSize: 16, color: '#333', lineHeight: 24, marginBottom: 16 },
  metaCard: { backgroundColor: '#f9f9f9', borderRadius: 12, padding: 16, marginBottom: 20, gap: 10 },
  metaRowInner: { flexDirection: 'row', justifyContent: 'space-between' },
  metaLabel: { fontSize: 13, color: '#888' },
  metaValue: { fontSize: 13, color: '#333', fontWeight: '500', maxWidth: '60%', textAlign: 'right' },
  statusButtons: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statusBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, borderWidth: 2, alignItems: 'center' },
  statusBtnText: { fontSize: 14, fontWeight: '600' },
  notesSection: { backgroundColor: '#f5f5f5', borderRadius: 12, padding: 16, marginBottom: 16 },
  notesLabel: { fontSize: 13, fontWeight: '600', color: '#666', marginBottom: 8 },
  notesInput: { backgroundColor: '#fff', borderRadius: 8, padding: 12, fontSize: 14, minHeight: 80, textAlignVertical: 'top' },
  notesActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 12 },
  notesCancel: { paddingVertical: 10, paddingHorizontal: 20 },
  notesCancelText: { color: '#666', fontSize: 14 },
  notesSave: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
  notesSaveText: { color: '#fff', fontSize: 14, fontWeight: '600' }
})