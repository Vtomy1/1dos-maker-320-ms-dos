import React, { useState } from 'react';
import {
  GameProject,
  GameEventRule,
  EventTriggerType,
  EventActionType,
} from '../types/dos';
import {
  Zap,
  Plus,
  Trash2,
  Volume2,
  Code,
  CheckCircle2,
  HelpCircle,
  ToggleLeft,
  ToggleRight,
  Play,
} from 'lucide-react';
import { soundBlaster } from '../engine/soundBlaster';

interface EventScriptEditorProps {
  project: GameProject;
  onUpdateProject: (updated: GameProject) => void;
}

const DEFAULT_RULES: GameEventRule[] = [
  {
    id: 'evt_jump',
    name: 'Player Jump Sound',
    enabled: true,
    trigger: 'on_jump',
    action: 'play_sound',
    actionParam: 'sb_jump',
  },
  {
    id: 'evt_gem',
    name: 'Collect Gem / Coin',
    enabled: true,
    trigger: 'on_collect_item',
    targetSpriteId: '*',
    action: 'play_sound',
    actionParam: 'sb_coin',
  },
  {
    id: 'evt_defeat',
    name: 'Defeat Slug Enemy',
    enabled: true,
    trigger: 'on_defeat_enemy',
    targetSpriteId: '*',
    action: 'play_sound',
    actionParam: 'sb_hit',
  },
  {
    id: 'evt_hurt',
    name: 'Take Enemy Damage',
    enabled: true,
    trigger: 'on_player_hit',
    action: 'play_sound',
    actionParam: 'sb_hit',
  },
  {
    id: 'evt_win',
    name: 'Exit Level Goal',
    enabled: true,
    trigger: 'on_level_clear',
    action: 'play_sound',
    actionParam: 'sb_win',
  },
];

export const EventScriptEditor: React.FC<EventScriptEditorProps> = ({
  project,
  onUpdateProject,
}) => {
  const events: GameEventRule[] = project.events || DEFAULT_RULES;
  const [selectedRuleId, setSelectedRuleId] = useState<string>(
    events[0]?.id || ''
  );
  const [showCodeView, setShowCodeView] = useState<boolean>(true);

  const selectedRule = events.find((e) => e.id === selectedRuleId) || events[0];

  const updateEvents = (newEvents: GameEventRule[]) => {
    onUpdateProject({
      ...project,
      events: newEvents,
    });
  };

  const handleUpdateRule = (id: string, partial: Partial<GameEventRule>) => {
    const updated = events.map((rule) =>
      rule.id === id ? { ...rule, ...partial } : rule
    );
    updateEvents(updated);
  };

  const handleAddRule = () => {
    const newId = `evt_${Date.now()}`;
    const newRule: GameEventRule = {
      id: newId,
      name: `Custom Trigger #${events.length + 1}`,
      enabled: true,
      trigger: 'on_collect_item',
      targetSpriteId: '*',
      action: 'play_sound',
      actionParam: 'sb_coin',
    };
    updateEvents([...events, newRule]);
    setSelectedRuleId(newId);
  };

  const handleDeleteRule = (id: string) => {
    if (events.length <= 1) return;
    const remaining = events.filter((e) => e.id !== id);
    updateEvents(remaining);
    if (selectedRuleId === id) {
      setSelectedRuleId(remaining[0]?.id || '');
    }
  };

  const playPreviewSound = (sfxId: string) => {
    const key = sfxId.replace('sb_', '') as
      | 'jump'
      | 'coin'
      | 'hit'
      | 'explosion'
      | 'laser'
      | 'win';
    soundBlaster.playDspPcm(key);
  };

  // Generate real Turbo C / x86 Event Dispatcher source code
  const generateTurboCCode = (): string => {
    const lines: string[] = [
      '/* ======================================================== */',
      '/* TURBO C 2.01 - EVENT_DISPATCHER.C                         */',
      '/* Real-Mode MS-DOS Event System for Sound Blaster 16       */',
      '/* ======================================================== */',
      '#include <dos.h>',
      '#include "game.h"',
      '#include "sb16.h"',
      '',
      'void Handle_Game_Event(enum EventTrigger trigger, const char* target_id) {',
    ];

    events.forEach((rule) => {
      if (!rule.enabled) return;
      lines.push(`    /* Rule: ${rule.name} */`);
      lines.push(`    if (trigger == TRIGGER_${rule.trigger.toUpperCase()}) {`);
      if (rule.targetSpriteId && rule.targetSpriteId !== '*') {
        lines.push(`        if (target_id != NULL && strcmp(target_id, "${rule.targetSpriteId}") == 0) {`);
      }

      if (rule.action === 'play_sound') {
        lines.push(`            SB16_Play_DSP_PCM(${rule.actionParam?.toUpperCase() || 'SFX_COIN'});`);
      } else if (rule.action === 'add_score') {
        lines.push(`            player_score += ${rule.actionParam || '100'};`);
      } else if (rule.action === 'damage_player') {
        lines.push(`            player_health = (player_health > 1) ? player_health - 1 : 0;`);
      } else if (rule.action === 'heal_player') {
        lines.push(`            if (player_health < player_max_health) player_health++;`);
      } else if (rule.action === 'restart_level') {
        lines.push(`            Load_Map_Level(current_map_index);`);
      }

      if (rule.targetSpriteId && rule.targetSpriteId !== '*') {
        lines.push(`        }`);
      }
      lines.push(`    }`);
      lines.push('');
    });

    lines.push('}');
    return lines.join('\n');
  };

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-4">
      {/* Top Banner */}
      <div className="bg-[#0000aa] border-2 border-[#5555ff] p-3 text-white flex flex-wrap items-center justify-between gap-3 shadow-[4px_4px_0px_#000000]">
        <div className="flex items-center space-x-2">
          <Zap className="w-5 h-5 text-yellow-300" />
          <h2 className="font-pixel text-sm text-yellow-300 tracking-wider">
            EVENT SCRIPT & TRIGGER-ACTION LOGIC
          </h2>
        </div>
        <div className="flex items-center space-x-3 text-xs font-mono">
          <span className="bg-[#000088] px-2 py-0.5 border border-[#5555ff] text-green-300">
            {events.length} ACTIVE RULES
          </span>
          <button
            onClick={() => setShowCodeView(!showCodeView)}
            className={`px-2 py-0.5 border flex items-center space-x-1 ${
              showCodeView
                ? 'bg-[#ffff55] text-black border-white font-bold'
                : 'bg-[#000088] text-white border-[#5555ff]'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            <span>TURBO C CODE: {showCodeView ? 'SHOWN' : 'HIDDEN'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Rules Master List */}
        <div className="lg:col-span-4 bg-[#000088] border-2 border-[#5555ff] p-3 text-white space-y-3">
          <div className="flex items-center justify-between border-b border-[#0000aa] pb-1">
            <span className="font-pixel text-[11px] text-yellow-300">TRIGGER RULES</span>
            <button
              onClick={handleAddRule}
              className="px-2 py-0.5 bg-[#00aa00] hover:bg-[#55ff55] hover:text-black text-white font-mono text-[11px] border border-white flex items-center space-x-1"
            >
              <Plus className="w-3 h-3" />
              <span>NEW RULE</span>
            </button>
          </div>

          <div className="space-y-1.5 max-h-[460px] overflow-y-auto pr-1">
            {events.map((rule) => {
              const isSel = rule.id === selectedRule?.id;
              return (
                <div
                  key={rule.id}
                  onClick={() => setSelectedRuleId(rule.id)}
                  className={`w-full p-2 font-mono text-xs cursor-pointer border transition-colors flex items-center justify-between ${
                    isSel
                      ? 'bg-[#ffff55] text-black border-white font-bold'
                      : 'bg-[#0000aa] hover:bg-[#0000cc] text-white border-[#5555ff]'
                  }`}
                >
                  <div className="flex items-center space-x-2 truncate">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUpdateRule(rule.id, { enabled: !rule.enabled });
                      }}
                      title="Toggle rule enabled"
                    >
                      {rule.enabled ? (
                        <CheckCircle2
                          className={`w-4 h-4 ${
                            isSel ? 'text-black' : 'text-green-400'
                          }`}
                        />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-gray-400" />
                      )}
                    </button>
                    <span className="truncate">{rule.name}</span>
                  </div>

                  <div className="flex items-center space-x-2 text-[10px]">
                    <span className="bg-[#000000]/30 px-1 py-0.5 rounded font-mono">
                      {rule.trigger.replace('on_', '')}
                    </span>
                    {events.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteRule(rule.id);
                        }}
                        className="text-red-400 hover:text-red-600 p-0.5"
                        title="Delete rule"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-2 bg-[#000044] border border-[#5555ff] text-[10px] font-mono text-[#aaaaaa]">
            Rule callbacks execute synchronously inside the 60 Hz MS-DOS main loop with zero frame latency.
          </div>
        </div>

        {/* Center / Right Column: Rule Config & Code Preview */}
        <div className={`space-y-4 ${showCodeView ? 'lg:col-span-8' : 'lg:col-span-8'}`}>
          {/* Rule Inspector Form */}
          {selectedRule && (
            <div className="bg-[#000088] border-2 border-[#5555ff] p-4 text-white space-y-4">
              <div className="flex items-center justify-between border-b border-[#0000aa] pb-2">
                <span className="font-pixel text-xs text-yellow-300">
                  EDIT RULE: {selectedRule.name.toUpperCase()}
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() =>
                      handleUpdateRule(selectedRule.id, {
                        enabled: !selectedRule.enabled,
                      })
                    }
                    className={`px-2 py-0.5 text-xs font-mono border flex items-center space-x-1 ${
                      selectedRule.enabled
                        ? 'bg-[#00aa00] text-black border-white font-bold'
                        : 'bg-[#aa0000] text-white border-red-300'
                    }`}
                  >
                    <span>{selectedRule.enabled ? 'RULE: ACTIVE' : 'RULE: DISABLED'}</span>
                  </button>
                </div>
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                {/* Rule Name */}
                <div className="space-y-1">
                  <label className="text-[#aaaaaa]">RULE TITLE / DESCRIPTION:</label>
                  <input
                    type="text"
                    value={selectedRule.name}
                    onChange={(e) =>
                      handleUpdateRule(selectedRule.id, { name: e.target.value })
                    }
                    className="w-full bg-[#000000] border border-[#5555ff] text-white px-2 py-1.5 focus:border-yellow-300 outline-none"
                  />
                </div>

                {/* Trigger Selector */}
                <div className="space-y-1">
                  <label className="text-[#aaaaaa]">EVENT TRIGGER (WHEN):</label>
                  <select
                    value={selectedRule.trigger}
                    onChange={(e) =>
                      handleUpdateRule(selectedRule.id, {
                        trigger: e.target.value as EventTriggerType,
                      })
                    }
                    className="w-full bg-[#000000] border border-[#5555ff] text-yellow-300 px-2 py-1.5 font-bold focus:border-yellow-300 outline-none"
                  >
                    <option value="on_jump">on_jump (Player Jumps)</option>
                    <option value="on_collect_item">on_collect_item (Collect Item / Coin)</option>
                    <option value="on_defeat_enemy">on_defeat_enemy (Stomp / Defeat Enemy)</option>
                    <option value="on_player_hit">on_player_hit (Player Takes Damage)</option>
                    <option value="on_level_clear">on_level_clear (Exit Door / Level Won)</option>
                    <option value="on_collide_entity">on_collide_entity (Generic Collision)</option>
                  </select>
                </div>

                {/* Target Sprite Selector */}
                <div className="space-y-1">
                  <label className="text-[#aaaaaa]">TARGET ENTITY / SPRITE:</label>
                  <select
                    value={selectedRule.targetSpriteId || '*'}
                    onChange={(e) =>
                      handleUpdateRule(selectedRule.id, {
                        targetSpriteId: e.target.value,
                      })
                    }
                    className="w-full bg-[#000000] border border-[#5555ff] text-cyan-300 px-2 py-1.5 focus:border-yellow-300 outline-none"
                  >
                    <option value="*">* Any Sprite / All Entities</option>
                    {project.sprites.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.type})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Action Selector */}
                <div className="space-y-1">
                  <label className="text-[#aaaaaa]">DISPATCH ACTION (THEN DO):</label>
                  <select
                    value={selectedRule.action}
                    onChange={(e) =>
                      handleUpdateRule(selectedRule.id, {
                        action: e.target.value as EventActionType,
                      })
                    }
                    className="w-full bg-[#000000] border border-[#5555ff] text-green-300 px-2 py-1.5 font-bold focus:border-yellow-300 outline-none"
                  >
                    <option value="play_sound">play_sound (Sound Blaster SFX)</option>
                    <option value="add_score">add_score (Award Score Points)</option>
                    <option value="damage_player">damage_player (Deduct Health)</option>
                    <option value="heal_player">heal_player (Restore Health)</option>
                    <option value="restart_level">restart_level (Reload Current Level)</option>
                  </select>
                </div>
              </div>

              {/* Action Parameter Configuration */}
              <div className="p-3 bg-[#000044] border border-[#5555ff] space-y-2">
                <div className="text-xs font-mono font-bold text-yellow-300">
                  ACTION PARAMETER:
                </div>

                {selectedRule.action === 'play_sound' && (
                  <div className="flex items-center space-x-3 text-xs font-mono">
                    <div className="flex-1">
                      <select
                        value={selectedRule.actionParam || 'sb_coin'}
                        onChange={(e) =>
                          handleUpdateRule(selectedRule.id, {
                            actionParam: e.target.value,
                          })
                        }
                        className="w-full bg-[#000000] border border-[#5555ff] text-white px-2 py-1 outline-none"
                      >
                        <option value="sb_jump">sb_jump (High frequency pitch slide)</option>
                        <option value="sb_coin">sb_coin (Two-tone gem pickup)</option>
                        <option value="sb_hit">sb_hit (Low punch impact)</option>
                        <option value="sb_laser">sb_laser (Synthesized laser zap)</option>
                        <option value="sb_explosion">sb_explosion (DSP noise burst)</option>
                        <option value="sb_win">sb_win (Victory fanfare)</option>
                      </select>
                    </div>

                    <button
                      onClick={() =>
                        playPreviewSound(selectedRule.actionParam || 'sb_coin')
                      }
                      className="px-3 py-1 bg-[#0000aa] hover:bg-[#ffff55] hover:text-black border border-[#5555ff] flex items-center space-x-1.5 text-yellow-300 font-bold"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>AUDITION SFX</span>
                    </button>
                  </div>
                )}

                {selectedRule.action === 'add_score' && (
                  <div className="flex items-center space-x-3 text-xs font-mono">
                    <label className="text-[#aaaaaa]">SCORE POINTS TO ADD:</label>
                    <input
                      type="number"
                      step={50}
                      min={10}
                      max={10000}
                      value={selectedRule.actionParam || '100'}
                      onChange={(e) =>
                        handleUpdateRule(selectedRule.id, {
                          actionParam: e.target.value,
                        })
                      }
                      className="w-32 bg-[#000000] border border-[#5555ff] text-yellow-300 px-2 py-1 font-bold"
                    />
                    <span className="text-[#aaaaaa]">POINTS</span>
                  </div>
                )}

                {(selectedRule.action === 'damage_player' ||
                  selectedRule.action === 'heal_player' ||
                  selectedRule.action === 'restart_level') && (
                  <div className="text-[11px] font-mono text-cyan-300">
                    Standard action requiring no extra arguments. Operates on the player state struct.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Real Turbo C Source Code View */}
          {showCodeView && (
            <div className="bg-[#000000] border-2 border-[#5555ff] p-3 text-white space-y-2">
              <div className="flex items-center justify-between border-b border-[#333333] pb-1">
                <span className="font-mono text-xs text-[#55ff55] flex items-center space-x-1.5">
                  <Code className="w-3.5 h-3.5" />
                  <span>BORLAND TURBO C 2.01 DISPATCH LOGIC (COMPILED TO x86)</span>
                </span>
                <span className="text-[10px] font-mono text-[#aaaaaa]">EVENT_DISPATCHER.C</span>
              </div>

              <pre className="font-mono text-[11px] text-[#55ff55] p-2 bg-[#000022] border border-[#222244] max-h-56 overflow-y-auto leading-relaxed whitespace-pre">
                {generateTurboCCode()}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
