// Big hospitals run many OPDs — each doctor holds an OPD room. Reception assigns a
// patient to a specific doctor; the display board groups rooms under departments.

import type { TriageLevel } from "@/store/usePatientStore"

export type OpdRoom = { doctor: string; department: string; room: string }

export const OPD_ROOMS: OpdRoom[] = [
  { doctor: "Dr. Priya Nair", department: "General Medicine", room: "Room 1" },
  { doctor: "Dr. Arjun Kuldeep", department: "General Medicine", room: "Room 2" },
  { doctor: "Dr. Rohan Mehta", department: "Cardiology", room: "Room 5" },
  { doctor: "Dr. Ananya Iyer", department: "Dermatology", room: "Room 8" },
  { doctor: "Dr. Vikram Rao", department: "Orthopaedics", room: "Room 6" },
]

export const OPD_DEPARTMENTS = Array.from(new Set(OPD_ROOMS.map(r => r.department)))
export const doctorsForDept = (dept: string) => OPD_ROOMS.filter(r => r.department === dept)
export const roomFor = (doctor: string) => OPD_ROOMS.find(r => r.doctor === doctor)

export const firstDoctorOf = (dept: string) => doctorsForDept(dept)[0]?.doctor ?? 'Dr. Priya Nair'

// Lightweight AI triage assist — keyword rules over the chief complaint. Stands in
// for a model; gives reception an instant suggested priority + department. Shared by
// the OPD queue and the patient registration page.
export function suggestTriage(complaint: string): { triage: TriageLevel; department: string; reason: string } | null {
  const c = complaint.toLowerCase().trim()
  if (!c) return null
  const has = (...words: string[]) => words.some(w => c.includes(w))
  if (has('chest pain', 'chest tightness', 'breathless', 'shortness of breath', 'unconscious', 'severe bleeding', 'stroke', 'collapse'))
    return { triage: 'Critical', department: 'Cardiology', reason: 'Possible cardiac/respiratory emergency — see immediately.' }
  if (has('high fever', 'severe pain', 'fracture', 'injury', 'head injury', 'vomiting blood', 'pregnan'))
    return { triage: 'High', department: has('fracture', 'injury') ? 'Orthopaedics' : 'General Medicine', reason: 'Urgent — prioritise for early assessment.' }
  if (has('fever', 'vomit', 'diarrhea', 'loose motion', 'abdominal', 'stomach', 'dizziness'))
    return { triage: 'Medium', department: 'General Medicine', reason: 'Moderate symptoms — standard triage.' }
  if (has('ear', 'throat', 'hearing', 'sinus')) return { triage: 'Low', department: 'ENT', reason: 'ENT complaint — routine.' }
  if (has('rash', 'skin', 'itch', 'acne')) return { triage: 'Low', department: 'Dermatology', reason: 'Skin complaint — routine.' }
  if (has('eye', 'vision', 'blurred')) return { triage: 'Low', department: 'Ophthalmology', reason: 'Eye complaint — routine.' }
  return { triage: 'Low', department: 'General Medicine', reason: 'No red flags detected — routine.' }
}
