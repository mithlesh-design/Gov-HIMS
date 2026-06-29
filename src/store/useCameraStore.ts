import { create } from 'zustand'

export type CameraRequestStatus = 'pending' | 'approved' | 'declined' | 'ended'

export interface CameraRequest {
  id: string
  patientId: string
  patientName: string
  wardRoom: string
  familyToken: string
  requestedAt: string
  status: CameraRequestStatus
  approvedAt?: string
  declinedAt?: string
  approvedBy?: string
}

interface CameraState {
  requests: CameraRequest[]
  requestCamera: (patientId: string, patientName: string, wardRoom: string, familyToken: string) => string
  approveRequest: (requestId: string, approvedBy: string) => void
  declineRequest: (requestId: string) => void
  endSession: (requestId: string) => void
}

export const useCameraStore = create<CameraState>((set) => ({
  requests: [],

  requestCamera: (patientId, patientName, wardRoom, familyToken) => {
    const id = `CAM-${Date.now()}`
    set((state) => ({
      requests: [
        ...state.requests.filter((r) => !(r.familyToken === familyToken && r.status !== 'ended')),
        {
          id,
          patientId,
          patientName,
          wardRoom,
          familyToken,
          requestedAt: new Date().toISOString(),
          status: 'pending',
        },
      ],
    }))
    return id
  },

  approveRequest: (requestId, approvedBy) =>
    set((state) => ({
      requests: state.requests.map((r) =>
        r.id === requestId
          ? { ...r, status: 'approved', approvedAt: new Date().toISOString(), approvedBy }
          : r
      ),
    })),

  declineRequest: (requestId) =>
    set((state) => ({
      requests: state.requests.map((r) =>
        r.id === requestId ? { ...r, status: 'declined', declinedAt: new Date().toISOString() } : r
      ),
    })),

  endSession: (requestId) =>
    set((state) => ({
      requests: state.requests.map((r) =>
        r.id === requestId ? { ...r, status: 'ended' } : r
      ),
    })),
}))
