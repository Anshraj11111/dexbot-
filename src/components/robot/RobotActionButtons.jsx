/**
 * RobotActionButtons — action buttons on each robot card.
 * Requirements: 3.4, 3.5, 3.9
 */
import { useNavigate } from 'react-router-dom';
import { Settings, MessageSquare, Smile, Palette, Upload, RefreshCw, Maximize2 } from 'lucide-react';
import { NeonButton } from '@/components/ui/NeonButton';
import { useToast } from '@/hooks/useToast';
import { getApiClient } from '@/services/apiClient';
import { useRobotState } from '@/hooks/useRobotState';

export function RobotActionButtons({ botId, onEmotionClick, onRgbClick, onMessageClick }) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const robot = useRobotState(botId);
  const isOnline = robot?.isOnline ?? false;

  const guardOffline = (action) => {
    if (!isOnline) {
      showToast('Robot is offline', 'warning');
      return;
    }
    action();
  };

  const handleRestart = () =>
    guardOffline(async () => {
      try {
        const client = getApiClient(botId, `http://${robot.ip}`);
        await client.post('/api/command', { command: 'restart' });
        showToast(`${botId} restart command sent`, 'success');
      } catch (err) {
        showToast(`Restart failed: ${err.message}`, 'error');
      }
    });

  const buttons = [
    {
      icon: Settings,
      label: 'Control',
      variant: 'primary',
      onClick: () => guardOffline(() => navigate(`/robots/${botId}/control`)),
    },
    {
      icon: MessageSquare,
      label: 'Message',
      variant: 'ghost',
      onClick: () => guardOffline(() => onMessageClick?.()),
    },
    {
      icon: Smile,
      label: 'Emotion',
      variant: 'purple',
      onClick: () => guardOffline(() => onEmotionClick?.()),
    },
    {
      icon: Palette,
      label: 'RGB',
      variant: 'ghost',
      onClick: () => guardOffline(() => onRgbClick?.()),
    },
    {
      icon: Upload,
      label: 'OTA',
      variant: 'ghost',
      onClick: () => guardOffline(() => navigate('/ota')),
    },
    {
      icon: RefreshCw,
      label: 'Restart',
      variant: 'danger',
      onClick: handleRestart,
    },
  ];

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-1.5">
        {buttons.map(({ icon: Icon, label, variant, onClick }) => (
          <NeonButton
            key={label}
            variant={isOnline ? variant : 'ghost'}
            size="sm"
            onClick={onClick}
            disabled={!isOnline}
            className="flex-col gap-1 h-14 text-xs"
            title={label}
          >
            <Icon className="w-4 h-4" />
            <span className="text-[10px]">{label}</span>
          </NeonButton>
        ))}
      </div>
      {/* Open Full View — always enabled */}
      <NeonButton
        variant="primary"
        size="sm"
        onClick={() => navigate(`/robots/${botId}/control`)}
        className="w-full gap-2"
      >
        <Maximize2 className="w-4 h-4" />
        Open Full View
      </NeonButton>
    </div>
  );
}
