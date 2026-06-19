import { supabase, isSupabaseConfigured } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateTOTP, generateRandomSecret } from './totp';

export interface MFAEnrollmentResult {
  id: string;
  type: 'totp';
  secret: string;
  uri: string;
}

/**
 * Enrolls a new TOTP MFA factor in Supabase.
 * Falls back to local simulated storage if Supabase is unconfigured or a network error occurs.
 */
export const enrollMFA = async (badgeNumber: string, email: string): Promise<MFAEnrollmentResult> => {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        issuer: 'Philippine National Police',
        friendlyName: `PNP Badge ${badgeNumber}`,
      });
      if (error) {
        throw error;
      }
      if (data && data.totp) {
        return {
          id: data.id,
          type: 'totp',
          secret: data.totp.secret,
          uri: data.totp.uri,
        };
      }
    } catch (err) {
      console.warn('Real Supabase MFA enrollment failed, falling back to local simulation:', err);
    }
  }

  // Simulated Fallback Engine
  const localSecret = generateRandomSecret();
  const mockId = `sim_factor_${Date.now()}`;
  const mockUri = `otpauth://totp/PNP%20Patroller%20(${badgeNumber})?secret=${localSecret}&issuer=Philippine%20National%20Police&algorithm=SHA1&digits=6&period=30`;
  
  const emailKey = email.trim().toLowerCase().replace(/[^a-zA-Z0-9]/g, '_');
  await AsyncStorage.setItem(`@pnp_supabase_mfa_sim_factor_id_${emailKey}`, mockId);
  await AsyncStorage.setItem(`@pnp_supabase_mfa_sim_secret_${emailKey}`, localSecret);
  await AsyncStorage.removeItem(`@pnp_supabase_mfa_sim_verified_${emailKey}`).catch(() => {});

  return {
    id: mockId,
    type: 'totp',
    secret: localSecret,
    uri: mockUri,
  };
};

/**
 * Verifies a code against an enrolled MFA factor.
 * Challenges the factor first to follow true Supabase protocol semantics, then verifies.
 */
export const verifyMFAEnrollment = async (
  email: string,
  factorId: string,
  code: string,
  secretKey?: string
): Promise<boolean> => {
  if (isSupabaseConfigured() && !factorId.startsWith('sim_')) {
    try {
      // 1. Create Supabase Challenge
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
      if (challengeError) {
        throw challengeError;
      }

      // 2. Verify with Challenge ID
      const { data: verifyData, error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code,
      });

      if (verifyError) {
        console.warn('Supabase MFA Verify challenge failed:', verifyError.message);
        return false;
      }

      return true;
    } catch (err) {
      console.warn('Real Supabase MFA verify failed, trying simulated logic:', err);
    }
  }

  // Simulated Verification Fallback
  const emailKey = email.trim().toLowerCase().replace(/[^a-zA-Z0-9]/g, '_');
  const storedSecret = secretKey || await AsyncStorage.getItem(`@pnp_supabase_mfa_sim_secret_${emailKey}`);
  if (!storedSecret) {
    return false;
  }

  const expected = generateTOTP(storedSecret);
  const expectedPrev = generateTOTP(storedSecret, Math.floor(Date.now() / 1000) - 30);
  const expectedNext = generateTOTP(storedSecret, Math.floor(Date.now() / 1000) + 30);

  if (code === expected || code === expectedPrev || code === expectedNext) {
    await AsyncStorage.setItem(`@pnp_supabase_mfa_sim_verified_${emailKey}`, 'true');
    return true;
  }

  return false;
};

/**
 * Checks if MFA is verified/enabled for the current user.
 */
export const checkMFAStatus = async (email: string): Promise<{ isEnabled: boolean; factorId?: string; secret?: string }> => {
  const emailKey = email.trim().toLowerCase().replace(/[^a-zA-Z0-9]/g, '_');

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (!error && data && data.all) {
        // Find verified factor
        const verifiedFactor = data.all.find(f => f.status === 'verified');
        if (verifiedFactor) {
          return { isEnabled: true, factorId: verifiedFactor.id };
        }
      }
    } catch (err) {
      console.warn('Error listing Supabase MFA factors, checking simulated local fallback:', err);
    }
  }

  // Simulated fallback factor checklist
  const simVerified = await AsyncStorage.getItem(`@pnp_supabase_mfa_sim_verified_${emailKey}`);
  if (simVerified === 'true') {
    const factorId = await AsyncStorage.getItem(`@pnp_supabase_mfa_sim_factor_id_${emailKey}`) || `sim_${Date.now()}`;
    const secret = await AsyncStorage.getItem(`@pnp_supabase_mfa_sim_secret_${emailKey}`) || '';
    return { isEnabled: true, factorId, secret };
  }

  return { isEnabled: false };
};

/**
 * Disables (unenrolls) the user's MFA.
 */
export const unenrollMFA = async (email: string, factorId: string): Promise<boolean> => {
  if (isSupabaseConfigured() && !factorId.startsWith('sim_')) {
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (!error) {
        return true;
      } else {
        console.warn('Supabase unenroll error:', error.message);
      }
    } catch (err) {
      console.warn('Unenrolling MFA via Supabase client failed:', err);
    }
  }

  // Simulated unenrollment
  const emailKey = email.trim().toLowerCase().replace(/[^a-zA-Z0-9]/g, '_');
  await AsyncStorage.removeItem(`@pnp_supabase_mfa_sim_factor_id_${emailKey}`).catch(() => {});
  await AsyncStorage.removeItem(`@pnp_supabase_mfa_sim_secret_${emailKey}`).catch(() => {});
  await AsyncStorage.removeItem(`@pnp_supabase_mfa_sim_verified_${emailKey}`).catch(() => {});
  return true;
};
