import React from 'react';
import {it,expect,beforeEach,vi} from 'vitest';
import {render,screen,waitFor,within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {App} from './main';
import {openDB,makeBackup,readAll} from './data';
beforeEach(async()=>{location.hash='#/workouts';const db=await openDB();await new Promise(resolve=>{const tx=db.transaction(['workouts','notes'],'readwrite');tx.objectStore('workouts').clear();tx.objectStore('notes').clear();tx.oncomplete=resolve;});});
it('logs, filters, edits, shows history, reloads and deletes a workout through the interface',async()=>{
 const user=userEvent.setup();const view=render(<App/>);await waitFor(()=>expect(screen.getAllByRole('button',{name:'Log a workout',exact:true}).length).toBeGreaterThan(0));
 const add=screen.getAllByRole('button',{name:'Log a workout',exact:true})[0];await waitFor(()=>expect(add.disabled).toBe(false));await user.click(add);
 await user.selectOptions(screen.getByLabelText('Body part'),'Legs');await user.type(screen.getByLabelText('Exercise name'),'Squat');await user.type(screen.getByLabelText('Max weight (kg)'),'60');await user.type(screen.getByLabelText('Reps at that weight'),'8');await user.click(screen.getByRole('button',{name:'Save workout'}));await screen.findByRole('button',{name:'Edit Squat'});
 await user.click(screen.getByRole('button',{name:'Chest',exact:true}));expect(screen.queryByRole('button',{name:'Edit Squat'})).toBeNull();await user.click(screen.getByRole('button',{name:'Legs',exact:true}));await user.click(screen.getByRole('button',{name:'Edit Squat'}));const weight=screen.getByLabelText('Max weight (kg)');await user.clear(weight);await user.type(weight,'65');await user.click(screen.getByRole('button',{name:'Save workout'}));await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull());
 await user.click(screen.getByRole('button',{name:'History for Squat'}));expect(screen.getByText('65 kg × 8 reps')).toBeDefined();await user.click(screen.getByRole('button',{name:'Close dialog'}));view.unmount();render(<App/>);await screen.findByRole('button',{name:'Edit Squat'});await user.click(screen.getByRole('button',{name:'Delete Squat'}));await user.click(screen.getByRole('button',{name:'Delete record'}));await waitFor(()=>expect(screen.queryByRole('button',{name:'Edit Squat'})).toBeNull());
});
it('creates colored notes, searches body text, edits and deletes',async()=>{
 const user=userEvent.setup();render(<App/>);await user.click(screen.getByRole('link',{name:/Notes/}));await waitFor(()=>expect(screen.getByRole('button',{name:'New note'}).disabled).toBe(false));await user.click(screen.getByRole('button',{name:'New note'}));await user.type(screen.getByLabelText('Title'),'Routine');await user.type(screen.getByLabelText('Note',{exact:true}),'Remember warmups');await user.click(screen.getByRole('button',{name:'lavender'}));await user.click(screen.getByRole('button',{name:'Save note'}));await screen.findByRole('button',{name:'Edit note Routine'});expect(screen.getByText('Remember warmups').closest('article').className).toContain('lavender');const search=screen.getByRole('textbox',{name:'Search notes'});await user.type(search,'missing');expect(screen.queryByRole('button',{name:'Edit note Routine'})).toBeNull();await user.clear(search);await user.type(search,'warmups');await user.click(screen.getByRole('button',{name:'Edit note Routine'}));await user.clear(screen.getByLabelText('Title'));await user.type(screen.getByLabelText('Title'),'Updated routine');await user.click(screen.getByRole('button',{name:'Save note'}));await screen.findByRole('button',{name:'Delete note Updated routine'});await user.click(screen.getByRole('button',{name:'Delete note Updated routine'}));await user.click(screen.getByRole('button',{name:'Delete record'}));await waitFor(()=>expect(screen.queryByText('Remember warmups')).toBeNull());
});
it('imports a selected JSON file after review and exports the stored snapshot',async()=>{
 const user=userEvent.setup(),view=render(<App/>);
 const fixture={workouts:[{id:'imported',exercise:'Deadlift',part:'Back',weight:80,reps:5,date:'2026-10-23',updatedAt:'2026-10-23T10:00:00Z'}],notes:[]};
 await waitFor(()=>expect(screen.getByRole('button',{name:'Import backup'}).disabled).toBe(false));
 await user.upload(view.container.querySelector('input[type=file]'),new File([makeBackup(fixture)],'backup.json',{type:'application/json'}));
 const dialog=await screen.findByRole('dialog');expect(within(dialog).getByText(/1 workouts and 0 notes/)).toBeDefined();expect((await readAll()).workouts).toHaveLength(0);
 await user.click(within(dialog).getByRole('button',{name:'Import backup'}));await screen.findByRole('button',{name:'Edit Deadlift'});
 let exported;Object.defineProperty(URL,'createObjectURL',{configurable:true,value:vi.fn(blob=>{exported=blob;return 'blob:backup';})});Object.defineProperty(URL,'revokeObjectURL',{configurable:true,value:vi.fn()});const click=vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(()=>{});
 await user.click(screen.getByRole('button',{name:'Export backup'}));await waitFor(()=>expect(click).toHaveBeenCalled());expect(JSON.parse(await exported.text()).workouts).toEqual(fixture.workouts);click.mockRestore();
});
