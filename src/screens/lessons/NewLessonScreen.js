import React, { useState, useEffect } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import * as Speech from 'expo-speech'
import { onAuthStateChanged } from 'firebase/auth'
import { addDoc, collection, onSnapshot, query, where, orderBy } from 'firebase/firestore'
import { auth, db } from '../../firebase.config'

const SEVERITY_OPTIONS = ['Low', 'Medium', 'High', 'Critical']
const SEVERITY_COLORS = {
  Low: '#3b82f6', Medium: '#f59e0b', High: '#f97316', Critical: '#dc2626'
}
const CATEGORY_OPTIONS = ['Engineering', 'Execution', 'Project Quality', 'Safety']
const WORK_AREA_OPTIONS = ['Substation', 'BESS', 'Collection', 'TLine']

export default function NewLessonScreen() {
  const navigation = useNavigation()
  const [user, setUser] = useState(null)
  const [orgId, setOrgId] = useState(null)
  const [userName, setUserName] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [projectId, setProjectId] = useState('')
  const [workArea, setWorkArea] = useState('')
  const [category, setCategory] = useState('')
  const [severity, setSeverity] = useState('Low')
  const [projects, setProjects] = useState([])
  const [showProjectInput, setShowProjectInput] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser)
        const { getDoc, doc } = require('firebase/firestore')
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid))
        if (userDoc.exists()) {
          setOrgId(userDoc.data().orgId)
          setUserName(firebaseUser.displayName || userDoc.data().name || 'Unknown')
        }

        // Load projects
        const q = query(collection(db, 'projects'), where('orgId', '==', userDoc.data().orgId), orderBy('createdAt', 'desc'))
        onSnapshot(q, (snap) => {
          setProjects(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        })
      }
    })
    return () => unsubscribe()
  }, [])

  const startVoice = async () => {
    setIsSpeaking(true)
    Alert.alert(
      'Voice Input',
      'Tap to start speaking. Tap again to stop.',
      [
        { text: 'Start', onPress: () => speak() },
        { text: 'Cancel', style: 'cancel', onPress: () => setIsSpeaking(false) }
      ]
    )
  }

  const speak = async () => {
    try {
      // Simple approach: use tts to indicate recording, then manually append
      setIsSpeaking(true)

      // For actual voice transcription, you'd integrate a service like
      // React Native Voice or Expo's Speech API with a transcription service.
      // Here we show a prompt and use placeholder - real implementation
      // would need a speech-to-text SDK integration.
      Alert.prompt(
        'Voice Note',
        'Speak your lesson description. Tap mic again or type below.',
        [
          { text: 'Done', onPress: () => setIsSpeaking(false) }
        ],
        'plain'
      )
    } catch (err) {
      setIsSpeaking(false)
      Alert.alert('Voice Error', 'Voice input not available')
    }
  }

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Required', 'Please enter a title')
      return
    }
    if (!category) {
      Alert.alert('Required', 'Please select a category')
      return
    }
    if (!workArea) {
      Alert.alert('Required', 'Please select a work area')
      return
    }

    setSaving(true)
    try {
      const lessonData = {
        title: title.trim(),
        description: description.trim(),
        category,
        workArea,
        severity,
        status: 'Open',
        orgId,
        createdBy: user.uid,
        createdByName: userName,
        projectId: projectId || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      const docRef = await addDoc(collection(db, 'lessons'), lessonData)

      // Write activity feed entry
      await addDoc(collection(db, 'activityFeed'), {
        orgId,
        type: 'lesson_created',
        lessonId: docRef.id,
        lessonTitle: title.trim(),
        userId: user.uid,
        userName,
        message: `New lesson created by ${userName}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })

      Alert.alert('Saved', 'Lesson created successfully', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ])
    } catch (err) {
      Alert.alert('Error', err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Lesson</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Voice Input Button */}
        <TouchableOpacity style={styles.voiceBtn} onPress={startVoice}>
          <Ionicons
            name={isSpeaking ? 'mic' : 'mic-outline'}
            size={40}
            color={isSpeaking ? '#dc2626' : '#2563eb'}
          />
          <Text style={[styles.voiceText, isSpeaking && styles.voiceTextActive]}>
            {isSpeaking ? 'Tap to stop' : 'Tap to speak'}
          </Text>
        </TouchableOpacity>

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

        {/* Title */}
        <Text style={styles.label}>Title *</Text>
        <TextInput
          style={styles.input}
          placeholder="Brief lesson title"
          value={title}
          onChangeText={setTitle}
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
          <TouchableOpacity
            style={[styles.pill, styles.pillAdd]}
            onPress={() => setShowProjectInput(!showProjectInput)}
          >
            <Ionicons name="add" size={16} color="#2563eb" />
            <Text style={styles.pillAddText}>New</Text>
          </TouchableOpacity>
        </View>
        {showProjectInput && (
          <TextInput
            style={styles.input}
            placeholder="New project name"
            value={newProjectName}
            onChangeText={setNewProjectName}
          />
        )}

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
              <Text style={[
                styles.pillText,
                severity === sev && { color: '#fff' }
              ]}>{sev}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, saving && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>Create Lesson</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#1a1a1a' },
  scrollView: { flex: 1 },
  content: { padding: 20, paddingBottom: 100 },
  voiceBtn: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f5f5f5',
    borderRadius: 16,
    marginBottom: 24
  },
  voiceText: { marginTop: 8, fontSize: 14, color: '#2563eb', fontWeight: '500' },
  voiceTextActive: { color: '#dc2626' },
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
  pillAdd: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#eff6ff' },
  pillAddText: { fontSize: 14, color: '#2563eb', fontWeight: '500' },
  submitBtn: {
    backgroundColor: '#2563eb', padding: 16, borderRadius: 8,
    alignItems: 'center', marginTop: 32, marginBottom: 40
  },
  submitBtnDisabled: { backgroundColor: '#93c5fd' },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '600' }
})