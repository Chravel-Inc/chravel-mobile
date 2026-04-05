import * as Haptics from 'expo-haptics';
import { triggerHaptic } from '../haptics';
import { HapticStyle } from '../bridge';

// Mock expo-haptics
jest.mock('expo-haptics', () => {
  return {
    impactAsync: jest.fn(),
    notificationAsync: jest.fn(),
    ImpactFeedbackStyle: {
      Light: 'light',
      Medium: 'medium',
      Heavy: 'heavy',
    },
    NotificationFeedbackType: {
      Success: 'success',
      Warning: 'warning',
      Error: 'error',
    },
  };
});

describe('haptics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('triggerHaptic', () => {
    it('calls impactAsync with Light for "light" style', async () => {
      await triggerHaptic('light' as HapticStyle);
      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
      expect(Haptics.notificationAsync).not.toHaveBeenCalled();
    });

    it('calls impactAsync with Medium for "medium" style', async () => {
      await triggerHaptic('medium' as HapticStyle);
      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Medium);
      expect(Haptics.notificationAsync).not.toHaveBeenCalled();
    });

    it('calls impactAsync with Heavy for "heavy" style', async () => {
      await triggerHaptic('heavy' as HapticStyle);
      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Heavy);
      expect(Haptics.notificationAsync).not.toHaveBeenCalled();
    });

    it('calls notificationAsync with Success for "success" style', async () => {
      await triggerHaptic('success' as HapticStyle);
      expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Success);
      expect(Haptics.impactAsync).not.toHaveBeenCalled();
    });

    it('calls notificationAsync with Warning for "warning" style', async () => {
      await triggerHaptic('warning' as HapticStyle);
      expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Warning);
      expect(Haptics.impactAsync).not.toHaveBeenCalled();
    });

    it('calls notificationAsync with Error for "error" style', async () => {
      await triggerHaptic('error' as HapticStyle);
      expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Error);
      expect(Haptics.impactAsync).not.toHaveBeenCalled();
    });

    it('does nothing for unknown styles', async () => {
      await triggerHaptic('unknown' as HapticStyle);
      expect(Haptics.impactAsync).not.toHaveBeenCalled();
      expect(Haptics.notificationAsync).not.toHaveBeenCalled();
    });
  });
});
