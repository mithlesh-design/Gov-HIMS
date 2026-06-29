// src/lib/intake/abha-mock.ts

export interface AbhaEligibilityResult {
  eligible: boolean
  schemeName: 'AB-PMJAY' | 'CMHIS-UP' | ''
  coverage: string
  preAuthRef: string
}

export async function checkAbhaEligibility(
  abhaId: string,
  ayushmanCardNo: string,
  method: 'abha' | 'ayushman' = 'abha',
): Promise<AbhaEligibilityResult> {
  await new Promise(r => setTimeout(r, 1200))

  if (method === 'abha') {
    if (abhaId.startsWith('00-')) return { eligible: false, schemeName: '', coverage: '', preAuthRef: '' }
    if (abhaId.length < 8) return { eligible: false, schemeName: '', coverage: '', preAuthRef: '' }
    const preAuthRef = `PMJAY-PRE-${Math.floor(1000000 + Math.random() * 9000000)}`
    return { eligible: true, schemeName: 'AB-PMJAY', coverage: 'Covered up to ₹5,00,000/year (AB-PMJAY)', preAuthRef }
  }

  if (ayushmanCardNo.trim().length < 6) return { eligible: false, schemeName: '', coverage: '', preAuthRef: '' }
  const schemeName = ayushmanCardNo.toUpperCase().startsWith('UP-') ? 'CMHIS-UP' : 'AB-PMJAY'
  const preAuthRef = schemeName === 'CMHIS-UP'
    ? `CMHIS-PRE-${Math.floor(1000000 + Math.random() * 9000000)}`
    : `PMJAY-PRE-${Math.floor(1000000 + Math.random() * 9000000)}`
  return {
    eligible: true,
    schemeName,
    coverage: schemeName === 'CMHIS-UP' ? 'Covered up to ₹5,00,000/year (CMHIS-UP)' : 'Covered up to ₹5,00,000/year (AB-PMJAY)',
    preAuthRef,
  }
}
