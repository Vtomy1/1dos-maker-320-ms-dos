/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { GameProject } from './types/dos';
import { createKeenProject, createDungeonProject, createSpaceProject } from './engine/gamePresets';
import { buildDosDistributionZip } from './engine/mzHeader';
import { DosHeader } from './components/DosHeader';
import { DosPlayer } from './components/DosPlayer';
import { MapEditor } from './components/MapEditor';
import { SpriteEditor } from './components/SpriteEditor';
import { SoundBlasterPanel } from './components/SoundBlasterPanel';
import { ExeHeaderInspector } from './components/ExeHeaderInspector';
import { PaletteEditor } from './components/PaletteEditor';
import { MusicSequencer } from './components/MusicSequencer';

export default function App() {
  const [project, setProject] = useState<GameProject>(() => createKeenProject());
  const [activeTab, setActiveTab] = useState<'play' | 'map' | 'sprite' | 'palette' | 'music' | 'sound' | 'exe' | 'code'>('play');
  const [crtEffect, setCrtEffect] = useState(true);

  // Switch game preset template
  const handleSelectTemplate = (template: 'keen' | 'dungeon' | 'space') => {
    if (template === 'keen') {
      setProject(createKeenProject());
    } else if (template === 'dungeon') {
      setProject(createDungeonProject());
    } else if (template === 'space') {
      setProject(createSpaceProject());
    }
  };

  // Download entire DOSBox package
  const handleDownloadPackage = async () => {
    try {
      const zipBlob = await buildDosDistributionZip(project);
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.title.replace(/\s+/g, '_')}_DOS.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error generating DOS package:', err);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b12] text-[#cccccc] flex flex-col justify-between selection:bg-[#ffff55] selection:text-black">
      {/* Top MS-DOS Turbo C Menu & Navigation */}
      <div>
        <DosHeader
          project={project}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          crtEffect={crtEffect}
          setCrtEffect={setCrtEffect}
          onSelectTemplate={handleSelectTemplate}
          onDownloadPackage={handleDownloadPackage}
        />

        {/* Main Content Area */}
        <main className="pb-8">
          {activeTab === 'play' && (
            <DosPlayer
              project={project}
              crtEffect={crtEffect}
              onOpenSoundBlaster={() => setActiveTab('sound')}
              onOpenMzInspector={() => setActiveTab('exe')}
            />
          )}

          {activeTab === 'map' && (
            <MapEditor
              project={project}
              onUpdateProject={setProject}
            />
          )}

          {activeTab === 'sprite' && (
            <SpriteEditor
              project={project}
              onUpdateProject={setProject}
            />
          )}

          {activeTab === 'palette' && (
            <PaletteEditor
              project={project}
              onUpdateProject={setProject}
            />
          )}

          {activeTab === 'music' && (
            <MusicSequencer
              project={project}
              onUpdateProject={setProject}
            />
          )}

          {activeTab === 'sound' && (
            <SoundBlasterPanel
              project={project}
              onUpdateProject={setProject}
            />
          )}

          {activeTab === 'exe' && (
            <ExeHeaderInspector
              project={project}
            />
          )}
        </main>
      </div>

      {/* Bottom MS-DOS Status Line (Borland / Norton Style) */}
      <footer className="bg-[#0000aa] text-[#ffffff] border-t-2 border-[#5555ff] px-3 py-1 font-mono text-[11px] flex flex-wrap items-center justify-between gap-2 select-none">
        <div className="flex items-center space-x-3">
          <span className="text-[#ffff55] font-bold">C:\GAMES\DOSMAKER&gt;</span>
          <span className="text-white font-bold">{project.title}.EXE</span>
          <span className="text-[#55ffff]">VGA MODE 13H (320x200 256c)</span>
        </div>

        <div className="flex items-center space-x-4 text-[10px]">
          <span className="text-[#55ff55]">
            SOUND BLASTER: A{project.sbConfig.basePort.replace('h','')} I{project.sbConfig.irq} D{project.sbConfig.dma8}
          </span>
          <span className="text-[#ffff55]">
            MAP: {project.maps[project.activeMapIndex]?.name || 'World 1'} ({project.maps[0]?.entities.length} ENTITIES)
          </span>
          <span className="text-white bg-[#000088] px-1.5 py-0.5 border border-[#5555ff]">
            CONVENTIONAL RAM: 640 KB
          </span>
        </div>
      </footer>
    </div>
  );
}
