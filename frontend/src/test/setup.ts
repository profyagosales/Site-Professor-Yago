/// <reference types="node" />

import { TextEncoder, TextDecoder } from 'util';

if (typeof globalThis.TextEncoder === 'undefined') {
	(globalThis as any).TextEncoder = TextEncoder;
}
if (typeof globalThis.TextDecoder === 'undefined') {
	(globalThis as any).TextDecoder = TextDecoder;
}

import '@testing-library/jest-dom';
