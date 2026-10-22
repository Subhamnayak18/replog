import 'fake-indexeddb/auto';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
afterEach(cleanup);
HTMLDialogElement.prototype.showModal=function(){this.open=true;};
HTMLDialogElement.prototype.close=function(){this.open=false;};
if(!Blob.prototype.text)Blob.prototype.text=function(){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsText(this);});};
