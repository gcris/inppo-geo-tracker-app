import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Text, Animated, Easing, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

interface AnimatedSplashScreenProps {
  onFinish: () => void;
  isDarkTheme: boolean;
}

export const AnimatedSplashScreen: React.FC<AnimatedSplashScreenProps> = ({ onFinish, isDarkTheme }) => {
  const colors = isDarkTheme ? {
    bg: '#0B121F',
    textMain: '#F8FAFC',
    textSec: '#94A3B8',
    tacticalGold: '#FACC15',
    policeBlue: '#1E3A8A',
    bodyMetal: '#1E293B',
    legNavy: '#0F172A',
    laserGreen: '#10B981',
  } : {
    bg: '#F1F5F9',
    textMain: '#0F172A',
    textSec: '#475569',
    tacticalGold: '#1E3A8A',
    policeBlue: '#2563EB',
    bodyMetal: '#334155',
    legNavy: '#1E293B',
    laserGreen: '#16A34A',
  };

  // Screen/Overall Scale
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const contentFadeAnim = useRef(new Animated.Value(0)).current;

  // Walk Cycle Animations
  const walkCycle = useRef(new Animated.Value(0)).current; // 0 to 1 cycle
  const gridCycle = useRef(new Animated.Value(0)).current; // 0 to 1 loop for moving ground

  // Loading Protocol States
  const [terminalLog, setTerminalLog] = useState<string>('Initializing secure SQLite engine...');
  const [percent, setPercent] = useState<number>(0);

  useEffect(() => {
    // 1. Fade in content on mount
    Animated.timing(contentFadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();

    // 2. Loop stride cycle
    Animated.loop(
      Animated.timing(walkCycle, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // 3. Loop moving ground grid
    Animated.loop(
      Animated.timing(gridCycle, {
        toValue: 1,
        duration: 800,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // 4. Progress percentage and boot logs simulator
    const progressInterval = setInterval(() => {
      setPercent(prev => {
        const next = prev + Math.floor(Math.random() * 8) + 4;
        return next > 100 ? 100 : next;
      });
    }, 150);

    const logs = [
      'Establishing TLS encrypted proxy handshake...',
      'Binding cell tower signals and sector vectors...',
      'Caching Local Tracking Database indexes...',
      'Verifying Google Authenticator MFA profiles...',
      'Pre-fetching active foot schedules...',
      'Arming background distress beacon systems...',
      'PNP Patrol Console online and secured.',
    ];

    let logIndex = 0;
    const logInterval = setInterval(() => {
      if (logIndex < logs.length) {
        setTerminalLog(logs[logIndex]);
        logIndex++;
      }
    }, 450);

    // 5. Exit transition after 3.8 seconds
    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 700,
        useNativeDriver: true,
      }).start(() => {
        clearInterval(progressInterval);
        clearInterval(logInterval);
        onFinish();
      });
    }, 3800);

    return () => {
      clearTimeout(timer);
      clearInterval(progressInterval);
      clearInterval(logInterval);
    };
  }, []);

  // Hip / leg sway interpolations
  // Leg 1 swings: forwards (0 to 0.25), back (0.25 to 0.75), forwards (0.75 to 1)
  const leftLegRot = walkCycle.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: ['-28deg', '0deg', '28deg', '0deg', '-28deg'],
  });

  const rightLegRot = walkCycle.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: ['28deg', '0deg', '-28deg', '0deg', '28deg'],
  });

  // Arms sway in opposition to thighs
  const leftArmRot = walkCycle.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: ['24deg', '0deg', '-24deg', '0deg', '24deg'],
  });

  const rightArmRot = walkCycle.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: ['-24deg', '0deg', '24deg', '0deg', '-24deg'],
  });

  // Vertical torso bobbing happens at twice the walk stride rate
  const bobbing = walkCycle.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [0, -5, 0, -5, 0],
  });

  // Moving ground dashed lines
  const gridTranslateX = gridCycle.interpolate({
    inputRange: [0, 1],
    outputRange: [60, 0], // moves to the left representing patrolling forward
  });

  return (
    <Animated.View style={[styles.container, { backgroundColor: colors.bg, opacity: fadeAnim }]}>
      <Animated.View style={[styles.content, { opacity: contentFadeAnim }]}>
        
        {/* Decorative Grid Scanning Circles */}
        <View style={styles.gridHolder}>
          <View style={[styles.radialWave, { borderColor: isDarkTheme ? '#1E293B' : '#E2E8F0', width: 280, height: 280, borderRadius: 140 }]} />
          <View style={[styles.radialWave, { borderColor: isDarkTheme ? '#1E293B' : '#E2E8F0', width: 180, height: 180, borderRadius: 90 }]} />
        </View>

        {/* Tactical Badge Header */}
        <View style={styles.headerBlock}>
          <Text style={[styles.brandPre, { color: colors.tacticalGold }]}>PHILIPPINE NATIONAL POLICE</Text>
          <Text style={[styles.brandTitle, { color: colors.textMain }]}>PATROL TRACKER</Text>
        </View>

        {/* WALKING PATROL OFFICER COMPOSITE MODEL */}
        <View style={styles.officerStage}>
          
          <Animated.View style={{ transform: [{ translateY: bobbing }] }}>
            
            {/* Top Level Cap & Head Container */}
            <View style={styles.headAssembly}>
              
              {/* Peak Police Cap */}
              <View style={styles.policeCap}>
                <View style={[styles.capVisor, { backgroundColor: colors.policeBlue }]} />
                <View style={[styles.capCrown, { backgroundColor: colors.bodyMetal }]} />
                <View style={[styles.capGoldStrip, { backgroundColor: colors.tacticalGold }]} />
                <View style={[styles.capGoldStar, { backgroundColor: colors.tacticalGold, transform: [{ rotate: '45deg' }] }]} />
              </View>

              {/* Face/Head Layer */}
              <View style={[styles.faceSphere, { backgroundColor: '#FDBA74' }]}>
                {/* Tactical sunglasses */}
                <View style={[styles.shadesRim, { backgroundColor: '#090D16' }]} />
              </View>

              {/* Neck */}
              <View style={[styles.neckStem, { backgroundColor: '#E0A96D' }]} />

            </View>

            {/* Torso Assembly with Tactical Vest */}
            <View style={[styles.torsoShell, { backgroundColor: colors.bodyMetal }]}>
              {/* Tactical Badge Patch */}
              <View style={[styles.vestPatrolBadge, { backgroundColor: colors.tacticalGold }]} />
              
              {/* Arm Left (swinging) */}
              <Animated.View style={[styles.armLeftAxis, { transform: [{ rotate: leftArmRot }] }]}>
                <View style={[styles.armSleeve, { backgroundColor: colors.policeBlue }]} />
                <View style={[styles.handKnuckles, { backgroundColor: '#FDBA74' }]} />
              </Animated.View>

              {/* Arm Right (swinging) */}
              <Animated.View style={[styles.armRightAxis, { transform: [{ rotate: rightArmRot }] }]}>
                <View style={[styles.armSleeve, { backgroundColor: colors.policeBlue }]} />
                <View style={[styles.handKnuckles, { backgroundColor: '#FDBA74' }]} />
              </Animated.View>

              {/* Officer Uniform Badge Label */}
              <Text style={styles.vestUtilityText}>PNP</Text>

            </View>

          </Animated.View>

          {/* Leg Left (swinging with pivot at hips) */}
          <Animated.View style={[styles.legLeftPivot, { transform: [{ rotate: leftLegRot }] }]}>
            <View style={[styles.pantLeg, { backgroundColor: colors.legNavy }]} />
            <View style={[styles.heavyOfficerBoot, { backgroundColor: '#090D16' }]} />
          </Animated.View>

          {/* Leg Right (swinging with pivot at hips) */}
          <Animated.View style={[styles.legRightPivot, { transform: [{ rotate: rightLegRot }] }]}>
            <View style={[styles.pantLeg, { backgroundColor: colors.legNavy }]} />
            <View style={[styles.heavyOfficerBoot, { backgroundColor: '#090D16' }]} />
          </Animated.View>

        </View>

        {/* Patrolling Sector Ground Plane Grid */}
        <View style={styles.gridGroundSection}>
          <View style={[styles.solidGroundRule, { backgroundColor: colors.textSec, opacity: 0.2 }]} />
          <Animated.View style={[styles.dashedMovingGrid, { transform: [{ translateX: gridTranslateX }] }]}>
            {Array.from({ length: 15 }).map((_, i) => (
              <View 
                key={i} 
                style={[
                  styles.movingGridTick, 
                  { backgroundColor: i % 2 === 0 ? colors.tacticalGold : colors.laserGreen, opacity: 0.6 }
                ]} 
              />
            ))}
          </Animated.View>
        </View>

        {/* Terminal Logging Section */}
        <View style={styles.terminalOverlay}>
          <View style={styles.statusBarBlock}>
            <View style={[styles.ledIndicator, { backgroundColor: colors.laserGreen }]} />
            <Text style={[styles.systemOnlineText, { color: colors.laserGreen }]}>SECURING SYSTEM CHANNEL</Text>
          </View>
          
          <Text style={[styles.terminalText, { color: colors.textSec }]} numberOfLines={1}>
            {`> `}{terminalLog}
          </Text>

          {/* Graphical Loading Bar */}
          <View style={[styles.pnpProgressBarBg, { backgroundColor: isDarkTheme ? '#1A2333' : '#E2E8F0' }]}>
            <View style={[styles.pnpProgressBarFill, { width: `${percent}%`, backgroundColor: colors.tacticalGold }]} />
          </View>
          <Text style={[styles.percentLabel, { color: colors.textMain }]}>{percent}% CONNECTED</Text>
        </View>

      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 24,
  },
  gridHolder: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    top: -20,
    zIndex: -1,
  },
  radialWave: {
    position: 'absolute',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    opacity: 0.08,
  },
  headerBlock: {
    alignItems: 'center',
    marginBottom: 45,
  },
  brandPre: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 2.5,
    marginBottom: 6,
    textAlign: 'center',
  },
  brandTitle: {
    fontSize: 27,
    fontWeight: '900',
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  officerStage: {
    width: 200,
    height: 190,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginBottom: 20,
  },
  headAssembly: {
    alignItems: 'center',
    position: 'relative',
    zIndex: 10,
    marginBottom: -2,
  },
  policeCap: {
    width: 32,
    height: 18,
    position: 'relative',
    alignItems: 'center',
    zIndex: 15,
  },
  capVisor: {
    width: 36,
    height: 5,
    borderRadius: 2,
    position: 'absolute',
    bottom: 0,
  },
  capCrown: {
    width: 28,
    height: 14,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    position: 'absolute',
    bottom: 3,
  },
  capGoldStrip: {
    width: 28,
    height: 2,
    position: 'absolute',
    bottom: 3,
  },
  capGoldStar: {
    width: 4,
    height: 4,
    position: 'absolute',
    top: 3,
  },
  faceSphere: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -2,
    zIndex: 8,
  },
  shadesRim: {
    width: 20,
    height: 6,
    borderRadius: 2,
    marginTop: -2,
  },
  neckStem: {
    width: 8,
    height: 8,
    marginTop: -4,
    zIndex: 5,
  },
  torsoShell: {
    width: 46,
    height: 54,
    borderRadius: 8,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  vestPatrolBadge: {
    width: 8,
    height: 10,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
    position: 'absolute',
    top: 6,
    left: 8,
  },
  vestUtilityText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginTop: 18,
  },
  armLeftAxis: {
    width: 10,
    height: 76, // 38 * 2
    position: 'absolute',
    left: -8,
    top: -15, // shifted to align hip center
    justifyContent: 'flex-end',
  },
  armRightAxis: {
    width: 10,
    height: 76, // 38 * 2
    position: 'absolute',
    right: -8,
    top: -15,
    justifyContent: 'flex-end',
  },
  armSleeve: {
    width: 8,
    height: 30,
    borderRadius: 4,
  },
  handKnuckles: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginTop: -2,
  },
  legLeftPivot: {
    position: 'absolute',
    top: 56, // Adjusted upwards to account for the pivot container's top-half spacer
    left: 84,
    width: 14,
    height: 100, // 50 * 2
    justifyContent: 'flex-end',
    zIndex: 1,
  },
  legRightPivot: {
    position: 'absolute',
    top: 56,
    right: 84,
    width: 14,
    height: 100, // 50 * 2
    justifyContent: 'flex-end',
    zIndex: 1,
  },
  pantLeg: {
    width: 10,
    height: 42,
    borderRadius: 3,
  },
  heavyOfficerBoot: {
    width: 15,
    height: 10,
    borderTopRightRadius: 6,
    borderBottomRightRadius: 3,
    borderBottomLeftRadius: 3,
    marginTop: -4,
    alignSelf: 'flex-start',
  },
  gridGroundSection: {
    width: '100%',
    height: 30,
    position: 'relative',
    overflow: 'hidden',
    marginBottom: 40,
  },
  solidGroundRule: {
    width: '100%',
    height: 3,
    borderRadius: 1,
  },
  dashedMovingGrid: {
    flexDirection: 'row',
    width: width + 120,
    marginTop: 10,
    paddingLeft: 20,
  },
  movingGridTick: {
    width: 12,
    height: 4,
    borderRadius: 2,
    marginRight: 24,
  },
  terminalOverlay: {
    width: '100%',
    padding: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  statusBarBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ledIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  systemOnlineText: {
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1.2,
  },
  terminalText: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'System', // clean sans cross-system font
    marginBottom: 14,
    height: 22,
  },
  pnpProgressBarBg: {
    height: 6,
    borderRadius: 3,
    width: '100%',
    overflow: 'hidden',
    marginBottom: 8,
  },
  pnpProgressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  percentLabel: {
    fontSize: 11,
    fontWeight: '900',
    textAlign: 'right',
    letterSpacing: 0.8,
  },
});
