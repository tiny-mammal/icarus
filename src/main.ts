import { mount } from 'svelte';
import './app.css';
import App from './App.svelte';
import { registerServiceWorker } from './lib/install.svelte';

const target = document.getElementById('app');
if (!target) throw new Error('Icarus: #app mount target not found');

const app = mount(App, { target });

registerServiceWorker();

export default app;
