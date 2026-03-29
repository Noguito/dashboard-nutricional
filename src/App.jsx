import React, { useState, useEffect, useMemo } from 'react';
import { LayoutDashboard, Calendar, ShoppingCart, Loader2, Save, Activity, Utensils, Info, Dumbbell, Flame, Calculator, TrendingDown, BarChart3, Users, LogOut } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';

// --- CONFIGURACIÓN FIREBASE REAL ---
const firebaseConfig = {
  apiKey: "AIzaSyApBDOomW_Hhh0K5FzW5inOm6KV2IiALao",
  authDomain: "dashboard-nutricional-ae424.firebaseapp.com",
  projectId: "dashboard-nutricional-ae424",
  storageBucket: "dashboard-nutricional-ae424.firebasestorage.app",
  messagingSenderId: "84229244482",
  appId: "1:84229244482:web:b1eeb4aa768790e173cfdb"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// --- VIP GUARD ---
const correosPermitidos = [
  "darkangel.adn@gmail.com",
  "gpogocruz@gmail.com"
];

// --- RUTAS DE BASE DE DATOS FAMILIAR ---
const getDocRefs = (profileId) => {
  return {
    planRef: doc(db, 'households', 'familia_adn_gap', 'plans', profileId),
    historyRef: doc(db, 'households', 'familia_adn_gap', 'histories', profileId)
  };
};

// --- CÁLCULOS ---
const getDynamicBaseGoals = (prof) => {
  const round5 = (num) => Math.round(num / 5) * 5;
  const lmk = prof.weight * (1 - (prof.bodyFat / 100));
  const lml = lmk * 2.20462;
  const bmr = 370 + (21.6 * lmk);
  const maint = round5(bmr * prof.activityLevel);
  const theoreticalTarget = maint - prof.manualDeficit;
  const prot = round5(lml * prof.proteinMultiplier);
  const fat = round5(lml * prof.fatMultiplier);
  const carb = round5((theoreticalTarget - (prot * 4) - (fat * 9)) / 4);
  const actualTarget = (prot * 4) + (fat * 9) + (carb * 4);
  const refeedCarbTotalG = round5(carb * (1 + prof.refeedCarbPercent / 100));
  const refeedProtTotalG = round5(prot * (1 + prof.refeedProtPercent / 100));
  const refeedTotalKcal = (refeedCarbTotalG * 4) + (refeedProtTotalG * 4) + (fat * 9);

  return { 
    kcal: actualTarget, prot, carb, gras: fat, maint, lmk, lml, bmr,
    refeedCarbTotalG, refeedProtTotalG, refeedTotalKcal
  };
};

const ACTIVITY_OPTIONS = {
  genesis: [
    { id: '', name: 'Descanso (Sin pesas)', kcal: 0, carb: 0 },
    { id: 'G1', name: 'Génesis adaptado (+200 kcal)', kcal: 200, carb: 50 },
    { id: 'G2', name: 'Génesis sólido (+300 kcal)', kcal: 300, carb: 75 },
  ],
  cardio: [
    { id: '', name: 'Sin cardio', kcal: 0, carb: 0 },
    { id: 'C1', name: 'Cardio corto suave 20m (90-120 kcal)', kcal: 105, carb: 26 },
    { id: 'C2', name: 'Cardio base moderado 30m (140-190 kcal)', kcal: 165, carb: 41 },
    { id: 'C3', name: 'Cardio largo moderado 40-45m (190-280 kcal)', kcal: 235, carb: 59 },
  ]
};

const DIET_OPTIONS = {
  desayunos: [
    { id: '', name: 'Ninguno' },
    { id: 'D1', name: 'Huevos + avena' },
    { id: 'D2', name: 'Yogurt + avena + huevos' },
    { id: 'D3', name: 'Sándwich de huevo' },
    { id: 'D4', name: 'Sándwich de atún mejorado' },
    { id: 'D5', name: 'Avena estilo cheesecake + 2 huevos' },
  ],
  frutas: [
    { id: '', name: 'Ninguno' },
    { id: 'F1', name: 'Banana' },
    { id: 'F2', name: 'Manzana' },
    { id: 'F3', name: 'Papaya' },
    { id: 'F4', name: 'Almendras (20g)' },
  ],
  almuerzos: [
    { id: '', name: 'Ninguno' },
    { id: 'AO1', name: 'Oficina ideal (270 kcal)' },
    { id: 'AO2', name: 'Oficina ideal con sopa (510 kcal)' },
    { id: 'AO3', name: 'Oficina fuerte controlado (470 kcal)' },
    { id: 'AO4', name: 'Oficina fuerte + ensalada (500 kcal)' },
    { id: 'AO5', name: 'Oficina fuerte + sopa (710 kcal)' },
    { id: 'AO6', name: 'Oficina social/pesado (900 kcal)' },
  ],
  meriendas: [
    { id: '', name: 'Ninguno' },
    { id: 'M1', name: 'Yogurt griego' },
    { id: 'M2', name: 'Huevos cocidos' },
    { id: 'M3', name: 'Sándwich de atún mejorado' },
    { id: 'M4', name: 'Café' },
    { id: 'M5', name: 'Ensalada de atún' },
    { id: 'M6', name: 'Atún + huevos duros' },
  ],
  cenas: [
    { id: '', name: 'Ninguno' },
    { id: 'C1', name: 'Pollo + arroz + ensalada' },
    { id: 'C2', name: 'Lentejas + huevos' },
    { id: 'C3', name: 'Atún + arroz + ensalada' },
    { id: 'C4', name: 'Pollo + papa + ensalada' },
    { id: 'L1', name: 'LIBRE: Hamburguesa' },
    { id: 'L2', name: 'LIBRE: Tacos' },
  ],
  refuerzos: [
    { id: '', name: 'Ninguno' },
    { id: 'R1', name: 'Atún (1 lata)' },
    { id: 'R2', name: 'Arroz (150g)' },
    { id: 'R3', name: 'Huevos (2 un)' },
    { id: 'R4', name: 'Yogurt griego (1 un)' },
    { id: 'R5', name: 'Banana (1 un)' },
    { id: 'R6', name: 'Pollo (100g)' },
    { id: 'R7', name: 'Aceite oliva (1 cda)' },
    { id: 'R8', name: 'Avena (50g)' },
    { id: 'R9', name: 'Pan alto en proteína (2 reb)' },
    { id: 'R10', name: 'Papaya (180g)' },
  ]
};

const MACROS_DB = {
  D1: { kcal: 405, prot: 26, carb: 33, gras: 19, portion: '3 huevos + 50 g avena', desc: 'Cocer avena 2 min y cocinar 3 huevos.' },
  D2: { kcal: 385, prot: 30, carb: 32, gras: 14.5, portion: '1 yogurt griego mora + 40 g avena + 2 huevos', desc: 'Mezclar yogurt y avena; añadir 2 huevos.' },
  D3: { kcal: 420, prot: 32, carb: 21, gras: 23, portion: '2 reb pan + 3 huevos + tomate/zanahoria', desc: 'Cocinar huevos y armar sándwich.' },
  D4: { kcal: 375, prot: 41, carb: 22, gras: 12, portion: '1 lata atún + 1 cda mayo light + 2 reb pan + vegetales', desc: 'Mezclar atún con vegetales y mayo; servir en pan.' },
  D5: { kcal: 550, prot: 34, carb: 52, gras: 23, portion: '40g avena + 5g chía + 100ml leche + 120g yogurt + mermelada + chocolate + 2 huevos', desc: 'Mezclar ingredientes base y refrigerar. Acompañar con huevos.' },
  M1: { kcal: 90, prot: 12, carb: 6, gras: 1.5, portion: '1 yogurt griego de mora', desc: 'Abrir yogurt.' },
  M2: { kcal: 140, prot: 12, carb: 0, gras: 10, portion: '2 huevos cocidos', desc: 'Pelar huevos.' },
  M3: { kcal: 375, prot: 41, carb: 22, gras: 12, portion: '1 lata atún + 1 cda mayo light + 2 reb pan + vegetales', desc: 'Igual que desayuno D4.' },
  M4: { kcal: 0, prot: 0, carb: 0, gras: 0, portion: '1 taza de café', desc: 'Preparar café.' },
  M5: { kcal: 150, prot: 27, carb: 5, gras: 1.5, portion: '1 lata atún + vegetales', desc: 'Mezclar atún con vegetales.' },
  M6: { kcal: 250, prot: 37, carb: 1.5, gras: 10.5, portion: '1 lata atún + 2 huevos cocidos', desc: 'Acompañar atún con huevos.' },
  C1: { kcal: 575, prot: 68, carb: 52, gras: 7, portion: '200 g pollo + 150 g arroz cocido + ensalada', desc: 'Cocinar pollo, calentar arroz y ensalada.' },
  C2: { kcal: 390, prot: 31, carb: 43, gras: 11, portion: '200 g lentejas + 2 huevos + zanahoria', desc: 'Calentar lentejas y cocinar huevos.' },
  C3: { kcal: 380, prot: 35, carb: 52, gras: 2, portion: '1 lata atún + 150 g arroz cocido + ensalada', desc: 'Abrir atún, calentar arroz y ensalada.' },
  C4: { kcal: 540, prot: 66, carb: 50, gras: 7, portion: '200 g pollo + 200 g papa + ensalada', desc: 'Cocinar pollo, hervir papa y ensalada.' },
  L1: { kcal: 740, prot: 57, carb: 54, gras: 34, portion: '200 g carne molida + 2 panes + cheddar + zanahoria', desc: 'Hacer hamburguesas.' },
  L2: { kcal: 730, prot: 53, carb: 75, gras: 27, portion: '180 g carne + 3 tortillas + frejol + vegetales', desc: 'Hacer tacos.' },
  AO1: { kcal: 270, prot: 30, carb: 20, gras: 8, portion: 'Baja en calorías + ensalada + agua', desc: 'Evitar sopas y frituras.' },
  AO2: { kcal: 510, prot: 36, carb: 42, gras: 14, portion: 'Sopa + baja en calorías + agua', desc: 'Principal ligero.' },
  AO3: { kcal: 470, prot: 28, carb: 45, gras: 18, portion: '1 opción fuerte + agua', desc: 'Fuerte sin extras.' },
  AO4: { kcal: 500, prot: 29, carb: 47, gras: 18, portion: '1 opción fuerte + ensalada + agua', desc: 'Equilibrado.' },
  AO5: { kcal: 710, prot: 34, carb: 68, gras: 24, portion: 'Sopa + 1 opción fuerte + agua', desc: 'Contundente.' },
  AO6: { kcal: 900, prot: 30, carb: 95, gras: 40, portion: 'Fuerte/snacks + bebida azucarada + postre', desc: 'Social/pesado.' },
  F1: { kcal: 105, prot: 1, carb: 27, gras: 0, portion: '1 banana', desc: '' },
  F2: { kcal: 95, prot: 0.5, carb: 25, gras: 0, portion: '1 manzana', desc: '' },
  F3: { kcal: 78, prot: 1, carb: 19, gras: 0, portion: '180 g papaya', desc: '' },
  F4: { kcal: 116, prot: 4, carb: 4, gras: 10.5, portion: '20 g almendras', desc: '' },
  R1: { kcal: 132, prot: 29, carb: 0, gras: 1, portion: '1 lata atún', desc: '' },
  R2: { kcal: 195, prot: 4, carb: 42, gras: 0, portion: '150 g arroz cocido extra', desc: '' },
  R3: { kcal: 144, prot: 13, carb: 1, gras: 10, portion: '2 huevos extra', desc: '' },
  R4: { kcal: 90, prot: 12, carb: 6, gras: 1.5, portion: '1 yogurt griego mora', desc: '' },
  R5: { kcal: 105, prot: 1, carb: 27, gras: 0, portion: '1 banana extra', desc: '' },
  R6: { kcal: 165, prot: 31, carb: 0, gras: 4, portion: '100 g pollo', desc: '' },
  R7: { kcal: 120, prot: 0, carb: 0, gras: 14, portion: '1 cda aceite oliva', desc: '' },
  R8: { kcal: 190, prot: 6, carb: 32, gras: 4, portion: '50 g avena', desc: '' },
  R9: { kcal: 190, prot: 12, carb: 17, gras: 8, portion: '2 reb pan', desc: '' },
  R10: { kcal: 78, prot: 1, carb: 19, gras: 0, portion: '180 g papaya', desc: '' },
};

const INGREDIENTS_DB = {
  D1: [{ name: 'Huevo', qty: 3, unit: 'un', cat: 'Proteínas' }, { name: 'Avena', qty: 50, unit: 'g', cat: 'Carbohidratos' }],
  D2: [{ name: 'Yogurt griego', qty: 1, unit: 'un', cat: 'Proteínas' }, { name: 'Avena', qty: 40, unit: 'g', cat: 'Carbohidratos' }, { name: 'Huevo', qty: 2, unit: 'un', cat: 'Proteínas' }],
  D3: [{ name: 'Pan integral alto en proteína', qty: 2, unit: 'reb', cat: 'Carbohidratos' }, { name: 'Huevo', qty: 3, unit: 'un', cat: 'Proteínas' }, { name: 'Tomate', qty: 1, unit: 'un', cat: 'Verduras' }, { name: 'Zanahoria', qty: 1, unit: 'un', cat: 'Verduras' }],
  D4: [{ name: 'Pan integral alto en proteína', qty: 2, unit: 'reb', cat: 'Carbohidratos' }, { name: 'Atún', qty: 1, unit: 'lata', cat: 'Proteínas' }, { name: 'Mayonesa light', qty: 15, unit: 'g', cat: 'Extras' }, { name: 'Cebolla colorada', qty: 1, unit: 'un', cat: 'Verduras' }, { name: 'Pepino', qty: 0.5, unit: 'un', cat: 'Verduras' }, { name: 'Limón', qty: 1, unit: 'un', cat: 'Extras' }, { name: 'Cilantro', qty: 1, unit: 'g', cat: 'Verduras' }],
  D5: [{ name: 'Avena', qty: 40, unit: 'g', cat: 'Carbohidratos' }, { name: 'Semillas de chía', qty: 5, unit: 'g', cat: 'Extras' }, { name: 'Esencia de vainilla', qty: 1, unit: 'cdita', cat: 'Extras' }, { name: 'Leche descremada/deslactosada', qty: 100, unit: 'ml', cat: 'Proteínas' }, { name: 'Yogurt griego natural Chivería', qty: 120, unit: 'g', cat: 'Proteínas' }, { name: 'Mermelada de fresa', qty: 15, unit: 'g', cat: 'Extras' }, { name: 'Chocolate negro', qty: 5, unit: 'g', cat: 'Extras' }, { name: 'Huevo', qty: 2, unit: 'un', cat: 'Proteínas' }],
  M1: [{ name: 'Yogurt griego', qty: 1, unit: 'un', cat: 'Proteínas' }],
  M2: [{ name: 'Huevo', qty: 2, unit: 'un', cat: 'Proteínas' }],
  M3: [{ name: 'Pan integral alto en proteína', qty: 2, unit: 'reb', cat: 'Carbohidratos' }, { name: 'Atún', qty: 1, unit: 'lata', cat: 'Proteínas' }, { name: 'Mayonesa light', qty: 15, unit: 'g', cat: 'Extras' }, { name: 'Cebolla colorada', qty: 1, unit: 'un', cat: 'Verduras' }, { name: 'Pepino', qty: 0.5, unit: 'un', cat: 'Verduras' }, { name: 'Limón', qty: 1, unit: 'un', cat: 'Extras' }, { name: 'Cilantro', qty: 1, unit: 'g', cat: 'Verduras' }],
  M4: [], 
  M5: [{ name: 'Atún', qty: 1, unit: 'lata', cat: 'Proteínas' }, { name: 'Tomate', qty: 1, unit: 'un', cat: 'Verduras' }, { name: 'Pepino', qty: 0.5, unit: 'un', cat: 'Verduras' }, { name: 'Limón', qty: 1, unit: 'un', cat: 'Extras' }],
  M6: [{ name: 'Atún', qty: 1, unit: 'lata', cat: 'Proteínas' }, { name: 'Huevo', qty: 2, unit: 'un', cat: 'Proteínas' }],
  C1: [{ name: 'Pollo', qty: 200, unit: 'g', cat: 'Proteínas' }, { name: 'Arroz cocido', qty: 150, unit: 'g', cat: 'Carbohidratos' }, { name: 'Tomate', qty: 1, unit: 'un', cat: 'Verduras' }, { name: 'Pepino', qty: 0.5, unit: 'un', cat: 'Verduras' }, { name: 'Zanahoria', qty: 1, unit: 'un', cat: 'Verduras' }, { name: 'Aceite de oliva extra virgen', qty: 1, unit: 'cda', cat: 'Extras' }],
  C2: [{ name: 'Lentejas cocidas', qty: 200, unit: 'g', cat: 'Carbohidratos' }, { name: 'Huevo', qty: 2, unit: 'un', cat: 'Proteínas' }, { name: 'Zanahoria', qty: 1, unit: 'un', cat: 'Verduras' }],
  C3: [{ name: 'Atún', qty: 1, unit: 'lata', cat: 'Proteínas' }, { name: 'Arroz cocido', qty: 150, unit: 'g', cat: 'Carbohidratos' }, { name: 'Tomate', qty: 1, unit: 'un', cat: 'Verduras' }, { name: 'Pepino', qty: 0.5, unit: 'un', cat: 'Verduras' }, { name: 'Aceite de oliva extra virgen', qty: 1, unit: 'cda', cat: 'Extras' }],
  C4: [{ name: 'Pollo', qty: 200, unit: 'g', cat: 'Proteínas' }, { name: 'Papa', qty: 200, unit: 'g', cat: 'Carbohidratos' }, { name: 'Tomate', qty: 1, unit: 'un', cat: 'Verduras' }, { name: 'Zanahoria', qty: 1, unit: 'un', cat: 'Verduras' }, { name: 'Aceite de oliva extra virgen', qty: 1, unit: 'cda', cat: 'Extras' }],
  L1: [{ name: 'Carne molida', qty: 200, unit: 'g', cat: 'Proteínas' }, { name: 'Pan hamburguesa', qty: 2, unit: 'un', cat: 'Carbohidratos' }, { name: 'Queso cheddar', qty: 30, unit: 'g', cat: 'Extras' }, { name: 'Zanahoria', qty: 1, unit: 'un', cat: 'Verduras' }],
  L2: [{ name: 'Carne molida', qty: 180, unit: 'g', cat: 'Proteínas' }, { name: 'Tortillas', qty: 3, unit: 'un', cat: 'Carbohidratos' }, { name: 'Lata de frejol', qty: 1, unit: 'lata', cat: 'Carbohidratos' }, { name: 'Zanahoria', qty: 1, unit: 'un', cat: 'Verduras' }, { name: 'Tomate', qty: 1, unit: 'un', cat: 'Verduras' }, { name: 'Aguacate', qty: 1, unit: 'un', cat: 'Extras' }, { name: 'Nachos', qty: 1, unit: 'bolsa', cat: 'Extras' }],
  F1: [{ name: 'Banana', qty: 1, unit: 'un', cat: 'Frutas' }],
  F2: [{ name: 'Manzana', qty: 1, unit: 'un', cat: 'Frutas' }],
  F3: [{ name: 'Papaya', qty: 180, unit: 'g', cat: 'Frutas' }],
  F4: [{ name: 'Almendras', qty: 20, unit: 'g', cat: 'Extras' }],
  R1: [{ name: 'Atún', qty: 1, unit: 'lata', cat: 'Proteínas' }],
  R2: [{ name: 'Arroz cocido', qty: 150, unit: 'g', cat: 'Carbohidratos' }],
  R3: [{ name: 'Huevo', qty: 2, unit: 'un', cat: 'Proteínas' }],
  R4: [{ name: 'Yogurt griego', qty: 1, unit: 'un', cat: 'Proteínas' }],
  R5: [{ name: 'Banana', qty: 1, unit: 'un', cat: 'Frutas' }],
  R6: [{ name: 'Pollo', qty: 100, unit: 'g', cat: 'Proteínas' }],
  R7: [{ name: 'Aceite de oliva extra virgen', qty: 1, unit: 'cda', cat: 'Extras' }],
  R8: [{ name: 'Avena', qty: 50, unit: 'g', cat: 'Carbohidratos' }],
  R9: [{ name: 'Pan integral alto en proteína', qty: 2, unit: 'reb', cat: 'Carbohidratos' }],
  R10: [{ name: 'Papaya', qty: 180, unit: 'g', cat: 'Frutas' }],
};

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

const MEALS_ALLOWING_FRUIT = {
  breakfast: ['D1', 'D2'],
  snacks: ['M1', 'M2', 'M4'] 
};

const SOMATOTYPE_RANGES = {
  ectomorfo: { protMin: 1.20, protMax: 1.35, fatMin: 0.20, fatMax: 0.40, refCarb: '40% a 100%', refProt: '12% a 15%' },
  mesomorfo: { protMin: 1.15, protMax: 1.35, fatMin: 0.20, fatMax: 0.35, refCarb: '40% a 80%', refProt: '10% a 12%' },
  endomorfo: { protMin: 1.25, protMax: 1.50, fatMin: 0.25, fatMax: 0.40, refCarb: '40% a 70%', refProt: '8% a 10%' }
};

const getRefeedFrequency = (bf) => {
  if (bf < 10) return 'Cada 3 a 4 días';
  if (bf <= 15) return 'Cada 4 a 5 días';
  if (bf <= 20) return 'Cada 5 a 7 días';
  if (bf <= 30) return 'Cada 7 a 10 días';
  return 'Cada 11 a 14 días';
};

const DEFAULT_PLAN = {
  Lunes: { D: 'D1', FD: 'F1', A: 'AO1', M: 'M1', FM: 'F2', C: 'C1', R1: 'R1', R2: 'R2', genesis: 'G1', cardio: '', extraKcal: 0, completed: {} },
  Martes: { D: 'D2', FD: 'F1', A: 'AO2', M: 'M3', FM: '', C: 'C2', R1: 'R5', R2: '', genesis: '', cardio: 'C1', extraKcal: 0, completed: {} },
  Miércoles: { D: 'D1', FD: 'F3', A: 'AO1', M: 'M2', FM: 'F2', C: 'L1', R1: '', R2: '', genesis: 'G1', cardio: '', extraKcal: 0, completed: {} },
  Jueves: { D: 'D3', FD: '', A: 'AO3', M: 'M1', FM: 'F2', C: 'C3', R1: 'R4', R2: '', genesis: '', cardio: 'C3', extraKcal: 0, completed: {} },
  Viernes: { D: 'D4', FD: '', A: 'AO1', M: 'M4', FM: 'F1', C: 'C4', R1: 'R6', R2: 'R3', genesis: 'G2', cardio: '', extraKcal: 0, completed: {} },
  Sábado: { D: 'D2', FD: 'F2', A: 'AO4', M: 'M1', FM: 'F3', C: 'L2', R1: '', R2: '', genesis: '', cardio: 'C2', extraKcal: 0, completed: {} },
  Domingo: { D: 'D1', FD: 'F1', A: 'AO1', M: 'M2', FM: 'F1', C: 'C1', R1: 'R8', R2: 'R1', genesis: '', cardio: '', extraKcal: 0, completed: {} }
};

const DEFAULT_PROFILE = { 
  weight: 103, bodyFat: 33, activityLevel: 1.5, somatotype: 'endomorfo',
  weightLossPercent: 0.5, manualDeficit: 700, proteinMultiplier: 1.3,
  fatMultiplier: 0.3, refeedCarbPercent: 40, refeedProtPercent: 0
};

export default function App() {
  const [user, setUser] = useState(null);
  const [currentProfileId, setCurrentProfileId] = useState('ADN');
  
  const [plans, setPlans] = useState({ ADN: DEFAULT_PLAN, GAP: DEFAULT_PLAN });
  const [profiles, setProfiles] = useState({ ADN: DEFAULT_PROFILE, GAP: DEFAULT_PROFILE });
  const [histories, setHistories] = useState({ ADN: [], GAP: [] });
  const [dailyLogsMap, setDailyLogsMap] = useState({ ADN: {}, GAP: {} });
  
  const [activeTab, setActiveTab] = useState('daily'); 
  const [activeDay, setActiveDay] = useState('Lunes');
  const [shoppingView, setShoppingView] = useState('general');
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newWeightEntry, setNewWeightEntry] = useState('');
  const [newDateEntry, setNewDateEntry] = useState(new Date().toISOString().split('T')[0]);

  const plan = plans[currentProfileId] || DEFAULT_PLAN;
  const profile = profiles[currentProfileId] || DEFAULT_PROFILE;
  const historyLog = histories[currentProfileId] || [];
  const dailyLogs = dailyLogsMap[currentProfileId] || {};

  const getWeekDates = () => {
    const curr = new Date();
    const day = curr.getDay();
    const diff = curr.getDate() - day + (day === 0 ? -6 : 1); 
    const monday = new Date(curr);
    monday.setDate(diff);
    
    const dates = {};
    DAYS.forEach((dayName, idx) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + idx);
      dates[dayName] = d.toISOString().split('T')[0];
    });
    return dates;
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        if (correosPermitidos.includes(currentUser.email)) {
          setUser(currentUser); 
        } else {
          signOut(auth);
          setUser(null);
          alert("Acceso denegado. Este dashboard es de uso privado para Ángel y Gabriela.");
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    setNewWeightEntry('');
  }, [currentProfileId]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    
    const fetchAllData = async () => {
      try {
        const refsADN = getDocRefs('ADN');
        const refsGAP = getDocRefs('GAP');

        const [docADN, histADN, docGAP, histGAP] = await Promise.all([
          getDoc(refsADN.planRef), getDoc(refsADN.historyRef),
          getDoc(refsGAP.planRef), getDoc(refsGAP.historyRef)
        ]);

        const newPlans = { ADN: DEFAULT_PLAN, GAP: DEFAULT_PLAN };
        const newProfiles = { ADN: DEFAULT_PROFILE, GAP: DEFAULT_PROFILE };
        const newHistories = { ADN: [], GAP: [] };
        const newDailyLogs = { ADN: {}, GAP: {} };

        if (docADN.exists()) {
          const data = docADN.data();
          if (data.weekly) newPlans.ADN = data.weekly;
          if (data.profile) newProfiles.ADN = { ...DEFAULT_PROFILE, ...data.profile };
        }
        if (histADN.exists()) {
          newHistories.ADN = histADN.data().records || [];
          newDailyLogs.ADN = histADN.data().dailyLogs || {};
        }

        if (docGAP.exists()) {
          const data = docGAP.data();
          if (data.weekly) newPlans.GAP = data.weekly;
          if (data.profile) newProfiles.GAP = { ...DEFAULT_PROFILE, ...data.profile };
        } else {
          await setDoc(refsGAP.planRef, { weekly: DEFAULT_PLAN, profile: DEFAULT_PROFILE });
        }
        if (histGAP.exists()) {
          newHistories.GAP = histGAP.data().records || [];
          newDailyLogs.GAP = histGAP.data().dailyLogs || {};
        }

        setPlans(newPlans);
        setProfiles(newProfiles);
        setHistories(newHistories);
        setDailyLogsMap(newDailyLogs);

      } catch (error) {
        console.error("Error obteniendo datos:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAllData();
  }, [user]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login fallido:", error);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  const getDayGoals = (dayPlan, prof) => {
    const base = getDynamicBaseGoals(prof);
    let goals = { kcal: base.kcal, prot: base.prot, carb: base.carb, gras: base.gras };
    let activityAdded = { kcal: 0, carb: 0 };

    if (dayPlan?.genesis) {
      const gen = ACTIVITY_OPTIONS.genesis.find(o => o.id === dayPlan.genesis);
      if (gen) {
        goals.kcal += gen.kcal;
        goals.carb += gen.carb;
        activityAdded.kcal += gen.kcal;
        activityAdded.carb += gen.carb;
      }
    }

    if (dayPlan?.cardio) {
      const car = ACTIVITY_OPTIONS.cardio.find(o => o.id === dayPlan.cardio);
      if (car) {
        goals.kcal += car.kcal;
        goals.carb += car.carb;
        activityAdded.kcal += car.kcal;
        activityAdded.carb += car.carb;
      }
    }
    return { goals, activityAdded };
  };

  const updateAndSaveDailyLogs = async (currentPlan, currentProfile, targetProfileId) => {
    if (!user) return;
    const weekDates = getWeekDates();
    const logsToUpdate = {};
    const { maint: maintenance } = getDynamicBaseGoals(currentProfile);

    DAYS.forEach(day => {
      const dateStr = weekDates[day];
      const dayPlan = currentPlan[day];
      if (!dayPlan) return;

      let consumed = Number(dayPlan.extraKcal || 0);
      const meals = ['D', 'FD', 'A', 'M', 'FM', 'C', 'R1', 'R2'];
      meals.forEach(m => {
        if (dayPlan.completed?.[m] && dayPlan[m] && MACROS_DB[dayPlan[m]]) {
          consumed += MACROS_DB[dayPlan[m]].kcal;
        }
      });

      const { activityAdded } = getDayGoals(dayPlan, currentProfile);
      const totalGoal = maintenance + activityAdded.kcal;
      const deficit = totalGoal - consumed;

      logsToUpdate[dateStr] = { consumed, goal: totalGoal, deficit };
    });

    setDailyLogsMap(prev => ({ 
      ...prev, 
      [targetProfileId]: { ...prev[targetProfileId], ...logsToUpdate } 
    }));

    const { historyRef } = getDocRefs(targetProfileId);
    try {
      await setDoc(historyRef, { dailyLogs: logsToUpdate }, { merge: true });
    } catch (error) {
      console.error("Error guardando logs diarios:", error);
    }
  };

  const savePlanToDB = async (currentPlan, currentProfile, targetProfileId) => {
    if (!user) return;
    setSaving(true);
    const { planRef } = getDocRefs(targetProfileId);
    try {
      await setDoc(planRef, { weekly: currentPlan, profile: currentProfile }, { merge: true });
    } catch (error) {
      console.error("Error guardando datos:", error);
    } finally {
      setTimeout(() => setSaving(false), 500); 
    }
  };

  const handleSelectChange = async (day, field, value) => {
    let newDayPlan = { ...plan[day], [field]: value };
    if (field === 'D' && !MEALS_ALLOWING_FRUIT.breakfast.includes(value)) newDayPlan.FD = '';
    if (field === 'M' && !MEALS_ALLOWING_FRUIT.snacks.includes(value)) newDayPlan.FM = '';

    const newPlan = { ...plan, [day]: newDayPlan };
    setPlans(prev => ({ ...prev, [currentProfileId]: newPlan }));
    
    savePlanToDB(newPlan, profile, currentProfileId);
    updateAndSaveDailyLogs(newPlan, profile, currentProfileId);
  };

  const handleMealCheck = (day, mealKey) => {
    const currentCompleted = plan[day]?.completed || {};
    const newCompleted = { ...currentCompleted, [mealKey]: !currentCompleted[mealKey] };
    const newPlan = { ...plan, [day]: { ...plan[day], completed: newCompleted } };
    
    setPlans(prev => ({ ...prev, [currentProfileId]: newPlan }));
    
    savePlanToDB(newPlan, profile, currentProfileId);
    updateAndSaveDailyLogs(newPlan, profile, currentProfileId);
  };

  const handleProfileChange = async (field, value) => {
    const parsedValue = field === 'somatotype' ? value : Number(value);
    let newProfile = { ...profile, [field]: parsedValue };
    
    if (field === 'somatotype') {
      const ranges = SOMATOTYPE_RANGES[parsedValue];
      if (newProfile.proteinMultiplier < ranges.protMin) newProfile.proteinMultiplier = ranges.protMin;
      if (newProfile.proteinMultiplier > ranges.protMax) newProfile.proteinMultiplier = ranges.protMax;
      if (newProfile.fatMultiplier < ranges.fatMin) newProfile.fatMultiplier = ranges.fatMin;
      if (newProfile.fatMultiplier > ranges.fatMax) newProfile.fatMultiplier = ranges.fatMax;
    }

    setProfiles(prev => ({ ...prev, [currentProfileId]: newProfile }));
    
    savePlanToDB(plan, newProfile, currentProfileId);
    updateAndSaveDailyLogs(plan, newProfile, currentProfileId);
  };

  const addWeightLog = async () => {
    if (!user || !newWeightEntry || !newDateEntry) return;
    setSaving(true);
    const newRecord = { date: newDateEntry, weight: Number(newWeightEntry) };
    
    let newLog = [...historyLog];
    const existingIdx = newLog.findIndex(r => r.date === newDateEntry);
    if (existingIdx >= 0) newLog[existingIdx] = newRecord;
    else newLog.push(newRecord);
    newLog.sort((a, b) => new Date(a.date) - new Date(b.date)); 

    setHistories(prev => ({ ...prev, [currentProfileId]: newLog }));
    
    const { historyRef } = getDocRefs(currentProfileId);
    try {
      await setDoc(historyRef, { records: newLog }, { merge: true });
      setNewWeightEntry('');
    } catch (error) {
      console.error("Error guardando historial:", error);
    } finally {
      setTimeout(() => setSaving(false), 500);
    }
  };

  const getDayMacros = (dayPlan) => {
    let totals = { kcal: 0, prot: 0, carb: 0, gras: 0 };
    const meals = [dayPlan?.D, dayPlan?.FD, dayPlan?.A, dayPlan?.M, dayPlan?.FM, dayPlan?.C, dayPlan?.R1, dayPlan?.R2];
    
    meals.forEach(id => {
      if (id && MACROS_DB[id]) {
        totals.kcal += MACROS_DB[id].kcal;
        totals.prot += MACROS_DB[id].prot;
        totals.carb += MACROS_DB[id].carb;
        totals.gras += MACROS_DB[id].gras;
      }
    });

    if (dayPlan?.extraKcal) totals.kcal += Number(dayPlan.extraKcal);
    return totals;
  };

  const getRealConsumed = (dayPlan) => {
    let consumed = Number(dayPlan?.extraKcal || 0);
    const meals = ['D', 'FD', 'A', 'M', 'FM', 'C', 'R1', 'R2'];
    meals.forEach(m => {
      if (dayPlan?.completed?.[m] && dayPlan[m] && MACROS_DB[dayPlan[m]]) {
        consumed += MACROS_DB[dayPlan[m]].kcal;
      }
    });
    return consumed;
  };

  const getShoppingList = useMemo(() => {
    const list = {};
    const plansToProcess = [];
    
    if (shoppingView === 'general') {
       if (plans.ADN) plansToProcess.push(plans.ADN);
       if (plans.GAP) plansToProcess.push(plans.GAP);
    } else if (shoppingView === 'ADN' && plans.ADN) {
       plansToProcess.push(plans.ADN);
    } else if (shoppingView === 'GAP' && plans.GAP) {
       plansToProcess.push(plans.GAP);
    }

    plansToProcess.forEach(p => {
      Object.values(p).forEach(dayPlan => {
        const meals = [dayPlan?.D, dayPlan?.FD, dayPlan?.A, dayPlan?.M, dayPlan?.FM, dayPlan?.C, dayPlan?.R1, dayPlan?.R2];
        meals.forEach(mealId => {
          if (!mealId) return;
          const ingredients = INGREDIENTS_DB[mealId] || [];
          ingredients.forEach(ing => {
            if (!list[ing.name]) {
              list[ing.name] = { qty: 0, unit: ing.unit, cat: ing.cat };
            }
            list[ing.name].qty += ing.qty;
          });
        });
      });
    });

    // --- Conversión de Arroz ---
    if (list['Arroz cocido']) {
      const cookedQty = list['Arroz cocido'].qty;
      const rawQty = Math.round(cookedQty / 1.8);
      if (list['Arroz']) list['Arroz'].qty += rawQty;
      else list['Arroz'] = { qty: rawQty, unit: list['Arroz cocido'].unit, cat: list['Arroz cocido'].cat };
      delete list['Arroz cocido'];
    }

    const grouped = {};
    Object.entries(list).forEach(([name, data]) => {
      if (!grouped[data.cat]) grouped[data.cat] = [];
      grouped[data.cat].push({ name, ...data });
    });
    return grouped;
  }, [plans, shoppingView]);

  const {
    kcal: targetKcal, prot: dailyProtG, carb: dailyCarbG, gras: dailyFatG, maint: maintenanceCals,
    lmk: leanMassKg, lml: leanMassLbs, bmr, refeedCarbTotalG, refeedProtTotalG, refeedTotalKcal
  } = useMemo(() => getDynamicBaseGoals(profile), [profile]);

  const dailyProtKcal = dailyProtG * 4;
  const dailyFatKcal = dailyFatG * 9;
  const dailyCarbKcal = dailyCarbG * 4;
  const weightLossKg = profile.weight * (profile.weightLossPercent / 100);
  const refeedFreq = getRefeedFrequency(profile.bodyFat);
  const somaRanges = SOMATOTYPE_RANGES[profile.somatotype] || SOMATOTYPE_RANGES.endomorfo;

  // --- COMPONENTES UI ---
  const ProgressBar = ({ label, current, target, colorClass }) => {
    const percent = Math.min(100, Math.max(0, (current / target) * 100));
    const isOver = current > target * 1.05; 
    const barColor = isOver && label === 'Kcal' ? 'bg-red-500' : colorClass;
    
    return (
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1 font-medium text-slate-700">
          <span>{label}</span>
          <span className={isOver && label === 'Kcal' ? 'text-red-600 font-bold' : ''}>
            {Math.round(current)} / {target}
          </span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-3">
          <div className={`h-3 rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${percent}%` }}></div>
        </div>
      </div>
    );
  };

  const renderWeightChart = () => {
    if (historyLog.length < 2) return <p className="text-sm text-slate-500 italic p-4 text-center bg-slate-50 rounded-lg mt-4">Registra al menos 2 pesos para ver tu gráfico.</p>;
    
    const minW = Math.min(...historyLog.map(h => h.weight)) - 1;
    const maxW = Math.max(...historyLog.map(h => h.weight)) + 1;
    const range = maxW - minW || 1;
    
    const points = historyLog.map((h, i) => {
      const x = (i / (historyLog.length - 1)) * 800;
      const y = 300 - ((h.weight - minW) / range) * 300;
      return { x, y, date: h.date, weight: h.weight };
    });

    const linePath = points.map((p, i) => (i === 0 ? `M ${p.x},${p.y}` : `L ${p.x},${p.y}`)).join(' ');
    const areaPath = `${linePath} L 800,300 L 0,300 Z`;
    const chartColor = currentProfileId === 'ADN' ? '#3b82f6' : '#9333ea';

    return (
      <div className="mt-4">
        <div className="w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-4 pt-8">
          <div className="relative w-full h-64 sm:h-72">
            <svg viewBox="0 -15 800 330" preserveAspectRatio="none" className="w-full h-full overflow-visible">
              <defs>
                <linearGradient id={`weightGrad_${currentProfileId}`} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor={chartColor} stopOpacity="0.4"/>
                  <stop offset="100%" stopColor={chartColor} stopOpacity="0.0"/>
                </linearGradient>
                <filter id={`shadowLine_${currentProfileId}`} x="-10%" y="-10%" width="120%" height="120%">
                  <feDropShadow dx="0" dy="6" stdDeviation="4" floodColor={chartColor} floodOpacity="0.3"/>
                </filter>
              </defs>
              <line x1="0" y1="0" x2="800" y2="0" stroke="#f1f5f9" strokeWidth="2" vectorEffect="non-scaling-stroke" />
              <line x1="0" y1="150" x2="800" y2="150" stroke="#f1f5f9" strokeWidth="2" strokeDasharray="6,6" vectorEffect="non-scaling-stroke" />
              <line x1="0" y1="300" x2="800" y2="300" stroke="#f1f5f9" strokeWidth="2" vectorEffect="non-scaling-stroke" />
              <path d={areaPath} fill={`url(#weightGrad_${currentProfileId})`} />
              <path d={linePath} fill="none" stroke={chartColor} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" filter={`url(#shadowLine_${currentProfileId})`} />
              {points.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r="5" fill="#ffffff" stroke={chartColor} strokeWidth="3" vectorEffect="non-scaling-stroke" className="cursor-pointer transition-all duration-300 hover:r-8 hover:fill-slate-50">
                  <title>{p.date}: {p.weight} kg</title>
                </circle>
              ))}
            </svg>
            <div className="absolute top-0 left-0 text-xs font-bold text-slate-400 bg-white/90 px-2 py-1 rounded-md">{maxW.toFixed(1)} kg</div>
            <div className="absolute bottom-0 left-0 text-xs font-bold text-slate-400 bg-white/90 px-2 py-1 rounded-md">{minW.toFixed(1)} kg</div>
          </div>
          <div className="flex justify-between mt-4 px-2 text-xs text-slate-500 font-medium tracking-wide">
            <span>{historyLog[0] ? historyLog[0].date : ''}</span>
            <span>{historyLog[historyLog.length - 1] ? historyLog[historyLog.length - 1].date : ''}</span>
          </div>
        </div>
      </div>
    );
  };

  const renderCalorieChart = () => {
    const last7Days = Array.from({length: 7}).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().split('T')[0];
    });

    let totalDeficit = 0;
    const chartData = last7Days.map(dateStr => {
      const log = dailyLogs[dateStr];
      if (log && log.consumed > 0) {
        totalDeficit += log.deficit;
        return { date: dateStr, ...log };
      }
      return { date: dateStr, consumed: 0, goal: maintenanceCals, deficit: 0 };
    });

    const maxGoal = Math.max(...chartData.map(d => d.goal), 2500);
    const maxY = maxGoal + 400; 
    
    const defColorStart = currentProfileId === 'ADN' ? '#60a5fa' : '#c084fc';
    const defColorEnd = currentProfileId === 'ADN' ? '#3b82f6' : '#9333ea';

    return (
      <div className="mt-10 border-t border-slate-100 pt-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 space-y-3 sm:space-y-0">
           <h3 className="font-semibold text-slate-800 flex items-center text-lg">
             <BarChart3 className={`h-6 w-6 mr-2 ${currentProfileId === 'ADN' ? 'text-blue-500' : 'text-purple-500'}`}/> Consumo vs Gasto (Últimos 7 días)
           </h3>
           <div className={`px-4 py-1.5 rounded-full text-sm font-bold shadow-sm ${totalDeficit >= 0 ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>
              {totalDeficit >= 0 ? '🔥 Déficit Acumulado: ' : '⚠️ Superávit Acumulado: '}
              {Math.abs(totalDeficit).toFixed(0)} kcal
           </div>
        </div>
        
        <div className="w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-4 pt-10">
          <div className="relative w-full h-64 sm:h-72">
            <svg viewBox="0 0 800 300" preserveAspectRatio="none" className="w-full h-full overflow-visible">
              <defs>
                 <linearGradient id="goalBar" x1="0" x2="0" y1="0" y2="1">
                   <stop offset="0%" stopColor="#f1f5f9" stopOpacity="1"/>
                   <stop offset="100%" stopColor="#e2e8f0" stopOpacity="1"/>
                 </linearGradient>
                 <linearGradient id={`consBarDef_${currentProfileId}`} x1="0" x2="0" y1="0" y2="1">
                   <stop offset="0%" stopColor={defColorStart} stopOpacity="1"/>
                   <stop offset="100%" stopColor={defColorEnd} stopOpacity="1"/>
                 </linearGradient>
                 <linearGradient id="consBarSurplus" x1="0" x2="0" y1="0" y2="1">
                   <stop offset="0%" stopColor="#f87171" stopOpacity="1"/>
                   <stop offset="100%" stopColor="#ef4444" stopOpacity="1"/>
                 </linearGradient>
              </defs>
              <line x1="0" y1={300 - (maintenanceCals/maxY)*300} x2="800" y2={300 - (maintenanceCals/maxY)*300} stroke="#cbd5e1" strokeWidth="2" strokeDasharray="8,8" vectorEffect="non-scaling-stroke" />
              <text x="10" y={300 - (maintenanceCals/maxY)*300 - 10} fill="#94a3b8" fontSize="14" fontWeight="bold">Mantenimiento Base ({maintenanceCals} kcal)</text>

              {chartData.map((data, i) => {
                const spacing = 800 / 7;
                const x = i * spacing + (spacing / 2) - 25; 
                const goalH = (data.goal / maxY) * 300;
                const consH = (data.consumed / maxY) * 300;
                const isSurplus = data.consumed > data.goal;

                return (
                  <g key={i} className="group">
                    <rect x={x - 10} y="0" width="70" height="300" fill="transparent" className="cursor-pointer" />
                    <rect x={x} y={300 - goalH} width="50" height={goalH} fill="url(#goalBar)" rx="8" />
                    <rect x={x + 10} y={300 - consH} width="30" height={consH} fill={isSurplus ? 'url(#consBarSurplus)' : `url(#consBarDef_${currentProfileId})`} rx="6" className="transition-all duration-300 group-hover:brightness-110 drop-shadow-md" />
                    <title>{data.date} | Consumido: {data.consumed} kcal | Gasto (Meta): {Math.round(data.goal)} kcal</title>
                  </g>
                );
              })}
            </svg>
          </div>
          <div className="flex justify-between mt-6 px-2 sm:px-6 text-xs text-slate-500 font-bold tracking-wide">
            {chartData.map((d, i) => {
               const [, m, day] = d.date.split('-');
               return <span key={i} className="flex-1 text-center">{day}/{m}</span>;
            })}
          </div>
          
          <div className="flex flex-wrap justify-center gap-4 mt-6 text-xs text-slate-600 font-medium border-t border-slate-100 pt-4">
             <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-slate-200 mr-2 shadow-sm border border-slate-300"></span> Gasto Total (Meta)</div>
             <div className="flex items-center"><span className={`w-3 h-3 rounded-full mr-2 shadow-sm ${currentProfileId === 'ADN' ? 'bg-blue-500' : 'bg-purple-500'}`}></span> Consumo en Déficit</div>
             <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-red-500 mr-2 shadow-sm"></span> Consumo en Exceso</div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin h-10 w-10 text-emerald-600" />
      </div>
    );
  }

  // --- PANTALLA DE LOGIN ---
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center max-w-md w-full">
          <Activity className="h-12 w-12 text-blue-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Dashboard Familiar</h1>
          <p className="text-slate-500 mb-8">Inicia sesión para acceder a tu plan nutricional y lista de compras compartida.</p>
          <button onClick={handleLogin} className="w-full flex items-center justify-center space-x-2 bg-white border border-slate-300 text-slate-700 font-bold py-3 px-4 rounded-lg hover:bg-slate-50 transition-colors">
            <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            <span>Continuar con Google</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-12">
      {/* HEADER */}
      <header className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-3">
            <div className="flex items-center space-x-2">
              <Activity className={`h-6 w-6 ${currentProfileId === 'ADN' ? 'text-blue-600' : 'text-purple-600'}`} />
              <h1 className="text-xl font-bold text-slate-900 hidden sm:block">Dashboard Nutricional</h1>
            </div>
            
            {/* SWITCHER DE PERFILES Y LOGOUT */}
            <div className="flex items-center space-x-4">
              <div className="flex bg-slate-100 p-1 rounded-full items-center shadow-inner border border-slate-200">
                 <button onClick={() => setCurrentProfileId('ADN')} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center ${currentProfileId === 'ADN' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>
                   <Users className="w-3 h-3 mr-1.5" /> ADN
                 </button>
                 <button onClick={() => setCurrentProfileId('GAP')} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center ${currentProfileId === 'GAP' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>
                   <Users className="w-3 h-3 mr-1.5" /> GAP
                 </button>
              </div>
              <button onClick={handleLogout} className="text-slate-400 hover:text-red-500 transition-colors" title="Cerrar Sesión">
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
          
          {/* TABS */}
          <div className="flex space-x-6 overflow-x-auto no-scrollbar border-t border-slate-100 pt-2">
            <button 
              onClick={() => setActiveTab('daily')}
              className={`pb-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${activeTab === 'daily' ? (currentProfileId === 'ADN' ? 'border-blue-500 text-blue-600' : 'border-purple-500 text-purple-600') : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              <div className="flex items-center space-x-2"><LayoutDashboard className="h-4 w-4"/><span>Dashboard Diario</span></div>
            </button>
            <button 
              onClick={() => setActiveTab('progress')}
              className={`pb-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${activeTab === 'progress' ? (currentProfileId === 'ADN' ? 'border-blue-500 text-blue-600' : 'border-purple-500 text-purple-600') : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              <div className="flex items-center space-x-2"><TrendingDown className="h-4 w-4"/><span>Progreso</span></div>
            </button>
            <button 
              onClick={() => setActiveTab('profile')}
              className={`pb-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${activeTab === 'profile' ? (currentProfileId === 'ADN' ? 'border-blue-500 text-blue-600' : 'border-purple-500 text-purple-600') : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              <div className="flex items-center space-x-2"><Calculator className="h-4 w-4"/><span>Calculadora</span></div>
            </button>
            <button 
              onClick={() => setActiveTab('weekly')}
              className={`pb-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${activeTab === 'weekly' ? (currentProfileId === 'ADN' ? 'border-blue-500 text-blue-600' : 'border-purple-500 text-purple-600') : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              <div className="flex items-center space-x-2"><Calendar className="h-4 w-4"/><span>Plan Semanal</span></div>
            </button>
            <button 
              onClick={() => setActiveTab('shopping')}
              className={`pb-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${activeTab === 'shopping' ? (currentProfileId === 'ADN' ? 'border-blue-500 text-blue-600' : 'border-purple-500 text-purple-600') : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              <div className="flex items-center space-x-2"><ShoppingCart className="h-4 w-4"/><span>Lista de Compras</span></div>
            </button>
          </div>

          {activeTab === 'daily' && (
            <div className="flex overflow-x-auto space-x-2 py-3 mt-1 border-t border-slate-100 no-scrollbar">
              {DAYS.map(day => (
                <button
                  key={day}
                  onClick={() => setActiveDay(day)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${activeDay === day ? (currentProfileId === 'ADN' ? 'bg-blue-600 text-white shadow-md' : 'bg-purple-600 text-white shadow-md') : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
                >
                  {day}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* TAB: PERFIL / CALCULADORA */}
        {activeTab === 'profile' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex justify-between items-center mb-6">
                 <div>
                    <h2 className="text-xl font-bold text-slate-800 mb-1 flex items-center">
                      <Calculator className={`h-6 w-6 mr-2 ${currentProfileId === 'ADN' ? 'text-blue-500' : 'text-purple-500'}`}/> Calculadora ({currentProfileId})
                    </h2>
                 </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="bg-slate-50 p-5 rounded-xl border border-slate-100 shadow-inner">
                    <h3 className="font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4 flex items-center">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs mr-2 ${currentProfileId === 'ADN' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>1</span> 
                      Tus Medidas
                    </h3>
                    
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Peso (kg)</label>
                        <input 
                          type="number" value={profile.weight} onChange={(e) => handleProfileChange('weight', e.target.value)}
                          className={`w-full text-sm border-slate-300 rounded-md shadow-sm focus:border-${currentProfileId === 'ADN' ? 'blue' : 'purple'}-500 focus:ring-${currentProfileId === 'ADN' ? 'blue' : 'purple'}-500`} step="0.1"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">% Grasa</label>
                        <input 
                          type="number" value={profile.bodyFat} onChange={(e) => handleProfileChange('bodyFat', e.target.value)}
                          className={`w-full text-sm border-slate-300 rounded-md shadow-sm focus:border-${currentProfileId === 'ADN' ? 'blue' : 'purple'}-500 focus:ring-${currentProfileId === 'ADN' ? 'blue' : 'purple'}-500`} step="0.1"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Somatotipo</label>
                        <select 
                          value={profile.somatotype} onChange={(e) => handleProfileChange('somatotype', e.target.value)}
                          className={`w-full text-sm border-slate-300 rounded-md shadow-sm focus:border-${currentProfileId === 'ADN' ? 'blue' : 'purple'}-500 focus:ring-${currentProfileId === 'ADN' ? 'blue' : 'purple'}-500 capitalize`}
                        >
                          <option value="ectomorfo">Ectomorfo</option>
                          <option value="mesomorfo">Mesomorfo</option>
                          <option value="endomorfo">Endomorfo</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Nivel Actividad</label>
                        <input 
                          type="number" value={profile.activityLevel} onChange={(e) => handleProfileChange('activityLevel', e.target.value)}
                          className={`w-full text-sm border-slate-300 rounded-md shadow-sm focus:border-${currentProfileId === 'ADN' ? 'blue' : 'purple'}-500 focus:ring-${currentProfileId === 'ADN' ? 'blue' : 'purple'}-500`} step="0.1"
                        />
                        <p className="text-[10px] text-slate-500 mt-1 leading-tight">
                          <b>Guía (hrs/sem):</b> 0h=1.2 | 1-2h=1.3 | 3-4h=1.4 | 5-6h=1.5 | 7-9h=1.6 | 10-11h=1.7 | 12-13h=1.8
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-5 rounded-xl border border-slate-100 shadow-inner">
                    <h3 className="font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4 flex items-center">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs mr-2 ${currentProfileId === 'ADN' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>2</span> 
                      Plan de Alimentación
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">% de peso a perder por semana</label>
                        <div className="flex items-center space-x-3">
                          <input 
                            type="number" value={profile.weightLossPercent} 
                            onChange={(e) => handleProfileChange('weightLossPercent', e.target.value)}
                            onBlur={(e) => {
                              let val = Number(e.target.value);
                              if (val < 0.5) handleProfileChange('weightLossPercent', 0.5);
                              else if (val > 1) handleProfileChange('weightLossPercent', 1);
                            }}
                            min="0.5" max="1"
                            className={`w-24 text-sm border-slate-300 rounded-md shadow-sm focus:border-${currentProfileId === 'ADN' ? 'blue' : 'purple'}-500 focus:ring-${currentProfileId === 'ADN' ? 'blue' : 'purple'}-500`} step="0.1"
                          />
                          <span className={`text-sm font-medium px-3 py-1.5 rounded-md border ${currentProfileId === 'ADN' ? 'text-blue-700 bg-blue-100 border-blue-200' : 'text-purple-700 bg-purple-100 border-purple-200'}`}>
                            {weightLossKg.toFixed(3)} kg ({ (weightLossKg * 2.20462).toFixed(2) } lbs)
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Déficit calórico diario (Manual)</label>
                        <div className="flex items-center space-x-3">
                          <input 
                            type="number" value={profile.manualDeficit} onChange={(e) => handleProfileChange('manualDeficit', e.target.value)}
                            className={`w-24 text-sm border-slate-300 rounded-md shadow-sm bg-yellow-50 focus:border-${currentProfileId === 'ADN' ? 'blue' : 'purple'}-500 focus:ring-${currentProfileId === 'ADN' ? 'blue' : 'purple'}-500`}
                          />
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1 leading-tight">
                          <b>Para perder:</b> 0.23kg/sem = 250 kcal | 0.45kg/sem = 500 kcal | 0.68kg/sem = 700 kcal | 0.91kg/sem = 1000 kcal
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-5 rounded-xl border border-slate-100 shadow-inner">
                    <h3 className="font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4 flex items-center">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs mr-2 ${currentProfileId === 'ADN' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>3</span> 
                      Día de Realimentación
                    </h3>
                    <div className="mb-4 bg-white p-3 rounded-lg border border-slate-200 flex justify-between items-center">
                      <span className="text-sm font-medium text-slate-700">Frecuencia recomendada:</span>
                      <span className={`text-sm font-bold px-2 py-1 rounded ${currentProfileId === 'ADN' ? 'text-blue-700 bg-blue-50' : 'text-purple-700 bg-purple-50'}`}>{refeedFreq}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Aumento Carbohidratos (%)</label>
                        <input 
                          type="number" value={profile.refeedCarbPercent} onChange={(e) => handleProfileChange('refeedCarbPercent', e.target.value)}
                          className={`w-full text-sm border-slate-300 rounded-md shadow-sm focus:border-${currentProfileId === 'ADN' ? 'blue' : 'purple'}-500 focus:ring-${currentProfileId === 'ADN' ? 'blue' : 'purple'}-500`}
                        />
                        <p className="text-[10px] text-slate-500 mt-1">Recomendado ({profile.somatotype}): <b>{somaRanges.refCarb}</b></p>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Aumento Proteínas (%)</label>
                        <input 
                          type="number" value={profile.refeedProtPercent} onChange={(e) => handleProfileChange('refeedProtPercent', e.target.value)}
                          className={`w-full text-sm border-slate-300 rounded-md shadow-sm focus:border-${currentProfileId === 'ADN' ? 'blue' : 'purple'}-500 focus:ring-${currentProfileId === 'ADN' ? 'blue' : 'purple'}-500`}
                        />
                        <p className="text-[10px] text-slate-500 mt-1">Recomendado ({profile.somatotype}): <b>{somaRanges.refProt}</b></p>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-3 italic">* No es necesario aumentar grasas en días de realimentación.</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                    <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-2 mb-4">Gasto Energético</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <span className="text-sm font-medium text-slate-600">Masa Magra (MM)</span>
                        <span className="text-sm font-bold font-mono text-slate-800">{leanMassKg.toFixed(1)} kg ({leanMassLbs.toFixed(1)} lb)</span>
                      </div>
                      <div className="flex justify-between items-center bg-amber-50 p-3 rounded-lg border border-amber-100">
                        <span className="text-sm font-bold text-amber-900">Mantenimiento (CM)</span>
                        <span className="text-lg font-bold font-mono text-amber-600">{maintenanceCals} kcal</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-2 mb-4">
                      <h3 className="font-bold text-slate-800">Macros (Días Normales)</h3>
                      <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2 py-1 rounded">Objetivo: {targetKcal} kcal</span>
                    </div>

                    <div className="space-y-4">
                      <div className={`p-3 rounded-lg border ${currentProfileId === 'ADN' ? 'bg-blue-50/50 border-blue-100' : 'bg-purple-50/50 border-purple-100'}`}>
                        <div className="flex justify-between items-center mb-2">
                          <label className={`text-sm font-bold ${currentProfileId === 'ADN' ? 'text-blue-800' : 'text-purple-800'}`}>
                            Proteína (Multiplicador)
                            <span className="block text-[10px] font-normal text-blue-600/70 mt-0.5">Rango recomendado: {somaRanges.protMin} - {somaRanges.protMax} gr/lb</span>
                          </label>
                        </div>
                        <div className="flex items-center space-x-4">
                          <input 
                            type="number" value={profile.proteinMultiplier} 
                            onChange={(e) => handleProfileChange('proteinMultiplier', e.target.value)}
                            min={somaRanges.protMin} max={somaRanges.protMax}
                            className={`w-20 text-sm rounded bg-white shadow-sm border-${currentProfileId === 'ADN' ? 'blue-200' : 'purple-200'} focus:border-${currentProfileId === 'ADN' ? 'blue' : 'purple'}-500 focus:ring-${currentProfileId === 'ADN' ? 'blue' : 'purple'}-500`} step="0.01"
                          />
                          <div className="flex-1 text-right">
                            <span className={`text-lg font-bold font-mono ${currentProfileId === 'ADN' ? 'text-blue-700' : 'text-purple-700'}`}>{dailyProtG} gr</span>
                            <span className={`text-xs ml-2 ${currentProfileId === 'ADN' ? 'text-blue-500' : 'text-purple-500'}`}>({dailyProtKcal} kcal)</span>
                          </div>
                        </div>
                      </div>

                      <div className={`p-3 rounded-lg border ${currentProfileId === 'ADN' ? 'bg-indigo-50/50 border-indigo-100' : 'bg-fuchsia-50/50 border-fuchsia-100'}`}>
                        <div className="flex justify-between items-center mb-2">
                          <label className={`text-sm font-bold ${currentProfileId === 'ADN' ? 'text-indigo-800' : 'text-fuchsia-800'}`}>
                            Grasa (Multiplicador)
                            <span className="block text-[10px] font-normal text-indigo-600/70 mt-0.5">Rango recomendado: {somaRanges.fatMin} - {somaRanges.fatMax} gr/lb</span>
                          </label>
                        </div>
                        <div className="flex items-center space-x-4">
                          <input 
                            type="number" value={profile.fatMultiplier} 
                            onChange={(e) => handleProfileChange('fatMultiplier', e.target.value)}
                            min={somaRanges.fatMin} max={somaRanges.fatMax}
                            className={`w-20 text-sm rounded bg-yellow-50 shadow-sm border-${currentProfileId === 'ADN' ? 'indigo-200' : 'fuchsia-200'} focus:border-${currentProfileId === 'ADN' ? 'indigo' : 'fuchsia'}-500 focus:ring-${currentProfileId === 'ADN' ? 'indigo' : 'fuchsia'}-500`} step="0.01"
                          />
                          <div className="flex-1 text-right">
                            <span className={`text-lg font-bold font-mono ${currentProfileId === 'ADN' ? 'text-indigo-700' : 'text-fuchsia-700'}`}>{dailyFatG} gr</span>
                            <span className={`text-xs ml-2 ${currentProfileId === 'ADN' ? 'text-indigo-500' : 'text-fuchsia-500'}`}>({dailyFatKcal} kcal)</span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-emerald-50/50 p-3 rounded-lg border border-emerald-100">
                        <div className="flex justify-between items-center mb-2">
                          <label className="text-sm font-bold text-emerald-800">Carbohidratos (Restante)</label>
                        </div>
                        <div className="flex justify-end items-center">
                          <div className="text-right">
                            <span className="text-lg font-bold font-mono text-emerald-700">{dailyCarbG} gr</span>
                            <span className="text-xs text-emerald-500 ml-2">({dailyCarbKcal} kcal)</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* SECCIÓN DE MACROS PARA REALIMENTACIÓN */}
                    <div className="mt-6 pt-6 border-t border-slate-200">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-slate-800">Macros Día de Realimentación</h3>
                        <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2 py-1 rounded">Objetivo: {Math.round(refeedTotalKcal)} kcal</span>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 text-center shadow-sm">
                          <div className="text-xs font-bold text-blue-800 mb-1">Proteína</div>
                          <div className="text-lg font-bold font-mono text-blue-700">{refeedProtTotalG}g</div>
                          <div className="text-[10px] text-blue-500">({refeedProtTotalG * 4} kcal)</div>
                        </div>
                        <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100 text-center shadow-sm">
                          <div className="text-xs font-bold text-emerald-800 mb-1">Carbs</div>
                          <div className="text-lg font-bold font-mono text-emerald-700">{refeedCarbTotalG}g</div>
                          <div className="text-[10px] text-emerald-500">({refeedCarbTotalG * 4} kcal)</div>
                        </div>
                        <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100 text-center shadow-sm">
                          <div className="text-xs font-bold text-indigo-800 mb-1">Grasa</div>
                          <div className="text-lg font-bold font-mono text-indigo-700">{dailyFatG}g</div>
                          <div className="text-[10px] text-indigo-500">({dailyFatKcal} kcal)</div>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: PROGRESO */}
        {activeTab === 'progress' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center border-b border-slate-100 pb-4">
                <TrendingDown className={`h-5 w-5 mr-2 ${currentProfileId === 'ADN' ? 'text-blue-500' : 'text-purple-500'}`}/> Historial de Peso y Cumplimiento ({currentProfileId})
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="col-span-1 bg-slate-50 p-5 rounded-lg border border-slate-100 h-fit">
                  <h3 className="font-semibold text-slate-700 mb-4">Registrar Nuevo Peso</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm text-slate-600 mb-1">Fecha</label>
                      <input 
                        type="date" 
                        value={newDateEntry}
                        onChange={(e) => setNewDateEntry(e.target.value)}
                        className={`block w-full text-sm border-slate-300 rounded-md shadow-sm focus:border-${currentProfileId === 'ADN' ? 'blue' : 'purple'}-500 focus:ring-${currentProfileId === 'ADN' ? 'blue' : 'purple'}-500`}
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-600 mb-1">Peso (kg)</label>
                      <input 
                        type="number" 
                        step="0.1"
                        value={newWeightEntry}
                        onChange={(e) => setNewWeightEntry(e.target.value)}
                        placeholder="Ej: 102.5"
                        className={`block w-full text-sm border-slate-300 rounded-md shadow-sm focus:border-${currentProfileId === 'ADN' ? 'blue' : 'purple'}-500 focus:ring-${currentProfileId === 'ADN' ? 'blue' : 'purple'}-500`}
                      />
                    </div>
                    <button 
                      onClick={addWeightLog}
                      disabled={!newWeightEntry}
                      className={`w-full mt-2 text-white text-sm font-medium py-2 rounded-md transition disabled:opacity-50 ${currentProfileId === 'ADN' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-purple-600 hover:bg-purple-700'}`}
                    >
                      Guardar Registro
                    </button>
                  </div>
                </div>

                <div className="col-span-1 md:col-span-2">
                  <h3 className="font-semibold text-slate-700 mb-2">Curva de Tendencia de Peso</h3>
                  {renderWeightChart()}
                </div>
              </div>
              
              {renderCalorieChart()}

              {historyLog.length > 0 && (
                <div className="mt-8 border-t border-slate-100 pt-6">
                  <h3 className="font-semibold text-slate-700 mb-4">Registros Anteriores</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm text-left">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500">
                          <th className="pb-2 font-medium">Fecha</th>
                          <th className="pb-2 font-medium">Peso Registrado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...historyLog].reverse().map((h, i) => (
                          <tr key={i} className="border-b border-slate-100 last:border-0">
                            <td className="py-2 text-slate-600">{h.date}</td>
                            <td className={`py-2 font-medium ${currentProfileId === 'ADN' ? 'text-blue-600' : 'text-purple-600'}`}>{h.weight} kg</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* TAB: PLAN SEMANAL */}
        {activeTab === 'weekly' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-start justify-between">
              <div className="flex space-x-3 items-start">
                 <Info className={`h-5 w-5 flex-shrink-0 mt-0.5 ${currentProfileId === 'ADN' ? 'text-blue-500' : 'text-purple-500'}`} />
                 <p className="text-sm text-slate-600">Configurando la semana para <strong>{currentProfileId}</strong>.</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider sticky left-0 bg-slate-50 z-10">Día</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Desayuno</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Fruta Des.</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Almuerzo</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Merienda</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Cena</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {DAYS.map(day => {
                    const allowFruitBreakfast = MEALS_ALLOWING_FRUIT.breakfast.includes(plan[day]?.D);
                    const allowFruitSnack = MEALS_ALLOWING_FRUIT.snacks.includes(plan[day]?.M);
                    const focusRing = currentProfileId === 'ADN' ? 'focus:ring-blue-500 focus:border-blue-500' : 'focus:ring-purple-500 focus:border-purple-500';

                    return (
                      <tr key={day} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-900 sticky left-0 bg-white shadow-[1px_0_0_0_#f1f5f9]">{day}</td>
                        <td className="px-4 py-2">
                          <select value={plan[day]?.D || ''} onChange={(e) => handleSelectChange(day, 'D', e.target.value)} className={`block w-full text-sm border-slate-200 rounded-md shadow-sm bg-slate-50 ${focusRing}`}>
                            {DIET_OPTIONS.desayunos.map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
                          </select>
                        </td>
                        <td className="px-4 py-2">
                          <select 
                            value={plan[day]?.FD || ''} 
                            onChange={(e) => handleSelectChange(day, 'FD', e.target.value)} 
                            disabled={!allowFruitBreakfast}
                            className={`block w-full text-sm rounded-md shadow-sm transition-colors ${focusRing} ${!allowFruitBreakfast ? 'bg-slate-100 text-slate-400 border-transparent cursor-not-allowed opacity-60' : 'bg-orange-50/50 border-slate-200'}`}
                          >
                            {!allowFruitBreakfast ? <option value="">- No aplica -</option> : DIET_OPTIONS.frutas.map(opt => <option key={opt.id} value={opt.id}>{opt.id === '' ? 'Ninguno' : '+ ' + opt.name}</option>)}
                          </select>
                        </td>
                        <td className="px-4 py-2">
                          <select value={plan[day]?.A || ''} onChange={(e) => handleSelectChange(day, 'A', e.target.value)} className={`block w-full text-sm border-slate-200 rounded-md shadow-sm bg-blue-50/50 ${focusRing}`}>
                            {DIET_OPTIONS.almuerzos.map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
                          </select>
                        </td>
                        <td className="px-4 py-2">
                          <div className="space-y-1.5 min-h-[44px]">
                            <select value={plan[day]?.M || ''} onChange={(e) => handleSelectChange(day, 'M', e.target.value)} className={`block w-full text-sm border-slate-200 rounded-md shadow-sm bg-slate-50 ${focusRing}`}>
                              {DIET_OPTIONS.meriendas.map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
                            </select>
                            {allowFruitSnack && (
                              <select value={plan[day]?.FM || ''} onChange={(e) => handleSelectChange(day, 'FM', e.target.value)} className={`block w-full text-xs border-slate-200 rounded-md shadow-sm bg-orange-50/50 transition-all ${focusRing}`}>
                                {DIET_OPTIONS.frutas.map(opt => <option key={opt.id} value={opt.id}>{opt.id === '' ? 'Ninguno' : '+ ' + opt.name}</option>)}
                              </select>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2">
                          <select value={plan[day]?.C || ''} onChange={(e) => handleSelectChange(day, 'C', e.target.value)} className={`block w-full text-sm border-slate-200 rounded-md shadow-sm bg-slate-50 ${focusRing}`}>
                            {DIET_OPTIONS.cenas.map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB: DASHBOARD DIARIO */}
        {activeTab === 'daily' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              <div className="space-y-6 lg:col-span-1">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Dumbbell className={`h-16 w-16 ${currentProfileId === 'ADN' ? 'text-indigo-500' : 'text-fuchsia-500'}`} />
                  </div>
                  <h2 className="text-lg font-bold text-slate-800 mb-5 flex items-center relative z-10">
                    <Flame className={`h-5 w-5 mr-2 ${currentProfileId === 'ADN' ? 'text-indigo-500' : 'text-fuchsia-500'}`}/> Actividad Física
                  </h2>
                  <div className="space-y-4 relative z-10">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Entrenamiento de Pesas</label>
                      <select
                        value={plan[activeDay]?.genesis || ''}
                        onChange={(e) => handleSelectChange(activeDay, 'genesis', e.target.value)}
                        className={`block w-full text-sm border-slate-200 rounded-md shadow-sm bg-${currentProfileId === 'ADN' ? 'indigo' : 'fuchsia'}-50/30 focus:border-${currentProfileId === 'ADN' ? 'indigo' : 'fuchsia'}-500 focus:ring-${currentProfileId === 'ADN' ? 'indigo' : 'fuchsia'}-500`}
                      >
                        {ACTIVITY_OPTIONS.genesis.map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Cardio</label>
                      <select
                        value={plan[activeDay]?.cardio || ''}
                        onChange={(e) => handleSelectChange(activeDay, 'cardio', e.target.value)}
                        className={`block w-full text-sm border-slate-200 rounded-md shadow-sm bg-${currentProfileId === 'ADN' ? 'indigo' : 'fuchsia'}-50/30 focus:border-${currentProfileId === 'ADN' ? 'indigo' : 'fuchsia'}-500 focus:ring-${currentProfileId === 'ADN' ? 'indigo' : 'fuchsia'}-500`}
                      >
                        {ACTIVITY_OPTIONS.cardio.map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-red-100 p-6 relative overflow-hidden">
                   <h2 className="text-md font-bold text-red-700 mb-3 flex items-center">Extras No Planificados</h2>
                  <input 
                    type="number" 
                    value={plan[activeDay]?.extraKcal || ''} 
                    onChange={(e) => handleSelectChange(activeDay, 'extraKcal', Number(e.target.value))}
                    placeholder="Kcal extras ej. 350"
                    className="block w-full text-sm border-red-200 rounded-md shadow-sm focus:border-red-500 focus:ring-red-500 bg-red-50"
                  />
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 h-fit">
                  <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center">
                    <Activity className={`h-5 w-5 mr-2 ${currentProfileId === 'ADN' ? 'text-emerald-500' : 'text-purple-500'}`}/> Macros de hoy
                  </h2>
                  
                  {(() => {
                    const macros = getDayMacros(plan[activeDay]);
                    const realConsumed = getRealConsumed(plan[activeDay]);
                    const { goals, activityAdded } = getDayGoals(plan[activeDay], profile);
                    const { maint, kcal: targetKcalBase } = getDynamicBaseGoals(profile);
                    const dailyMaintenance = maint + activityAdded.kcal;
                    const projectedDeficit = dailyMaintenance - macros.kcal;
                    
                    return (
                      <div className="space-y-6">
                        <ProgressBar label="Kcal Planeadas" current={macros.kcal} target={goals.kcal} colorClass={currentProfileId === 'ADN' ? 'bg-amber-500' : 'bg-pink-400'} />
                        <ProgressBar label="Proteína (g)" current={macros.prot} target={goals.prot} colorClass="bg-blue-500" />
                        <ProgressBar label="Carbohidratos (g)" current={macros.carb} target={goals.carb} colorClass="bg-emerald-500" />
                        <ProgressBar label="Grasas (g)" current={macros.gras} target={goals.gras} colorClass="bg-purple-500" />
                        
                        <div className="pt-4 border-t border-slate-100">
                          <div className={`p-4 rounded-lg border ${projectedDeficit >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                            <p className="text-xs text-slate-600 mb-1">Mantenimiento + Actividad: <strong>{dailyMaintenance} kcal</strong></p>
                            <p className="text-xs text-slate-600 mb-1">Total Consumido Proyectado: <strong>{macros.kcal} kcal</strong></p>
                            <p className="text-xs text-slate-600 mb-3">Total Consumido REAL (Marcado ✔️): <strong className={`${currentProfileId === 'ADN' ? 'text-blue-600' : 'text-purple-600'} text-sm`}>{realConsumed} kcal</strong></p>
                            <div className="flex items-center pt-3 border-t border-slate-200/50">
                              {projectedDeficit >= 0 ? (
                                <span className="text-sm font-bold text-emerald-700">🔥 Déficit Proyectado: {projectedDeficit} kcal</span>
                              ) : (
                                <span className="text-sm font-bold text-red-700">⚠️ Superávit Proyectado: {Math.abs(projectedDeficit)} kcal</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 lg:col-span-2">
                <div className="flex justify-between items-center mb-2">
                   <h2 className="text-lg font-bold text-slate-800 flex items-center">
                     <Utensils className={`h-5 w-5 mr-2 ${currentProfileId === 'ADN' ? 'text-emerald-500' : 'text-purple-500'}`}/> Comidas Planeadas
                   </h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  {[
                    { title: 'Desayuno', key: 'D', items: [plan[activeDay]?.D, plan[activeDay]?.FD], color: 'border-l-orange-400' },
                    { title: 'Almuerzo', key: 'A', items: [plan[activeDay]?.A], color: 'border-l-blue-400' },
                    { title: 'Merienda', key: 'M', items: [plan[activeDay]?.M, plan[activeDay]?.FM], color: 'border-l-teal-400' },
                    { title: 'Cena', key: 'C', items: [plan[activeDay]?.C], color: 'border-l-indigo-400' }
                  ].map((meal, idx) => {
                    const activeItems = meal.items.filter(Boolean);
                    if (activeItems.length === 0) return null;
                    const isCompleted = plan[activeDay]?.completed?.[meal.key] || false;
                    const ringColor = currentProfileId === 'ADN' ? 'text-blue-600 focus:ring-blue-500' : 'text-purple-600 focus:ring-purple-500';

                    return (
                      <div key={idx} className={`bg-slate-50 rounded-r-lg p-4 border-l-4 ${meal.color} transition-all duration-300 ${isCompleted ? `opacity-60 grayscale-[50%] ${currentProfileId === 'ADN' ? 'bg-blue-50/30' : 'bg-purple-50/30'}` : ''}`}>
                        <div className="flex justify-between items-center mb-2">
                          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">{meal.title}</h3>
                          <label className="flex items-center cursor-pointer space-x-2">
                            <input 
                              type="checkbox" 
                              checked={isCompleted}
                              onChange={() => handleMealCheck(activeDay, meal.key)}
                              className={`w-5 h-5 rounded border-slate-300 cursor-pointer ${ringColor}`}
                            />
                          </label>
                        </div>
                        <ul className="space-y-3">
                          {activeItems.map(id => {
                            const data = MACROS_DB[id];
                            if (!data) return null;
                            const optionName = [...DIET_OPTIONS.desayunos, ...DIET_OPTIONS.frutas, ...DIET_OPTIONS.almuerzos, ...DIET_OPTIONS.meriendas, ...DIET_OPTIONS.cenas, ...DIET_OPTIONS.refuerzos].find(o => o.id === id)?.name || id;
                            return (
                              <li key={id} className="text-sm bg-white p-3 rounded-md border border-slate-100 shadow-sm">
                                <div className="font-bold text-slate-800">{optionName}</div>
                                {data.portion && <div className={`text-sm font-semibold mt-1 ${currentProfileId === 'ADN' ? 'text-emerald-700' : 'text-purple-700'}`}>{data.portion}</div>}
                                <div className="flex space-x-4 mt-3 pt-2 border-t border-slate-100 text-xs font-mono text-slate-600">
                                  <span className="font-bold text-slate-700">{data.kcal} kcal</span>
                                  <span className="text-blue-600">{data.prot}p</span>
                                  <span className="text-emerald-600">{data.carb}c</span>
                                  <span className="text-purple-600">{data.gras}g</span>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-8 pt-6 border-t border-slate-100">
                  <h3 className="text-md font-bold text-slate-800 mb-4 flex items-center"><Activity className="h-4 w-4 mr-2 text-amber-500"/> Refuerzos del Día</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className={`bg-amber-50/50 p-4 rounded-lg border transition-all ${plan[activeDay]?.completed?.R1 ? 'border-amber-300 opacity-70' : 'border-amber-100'}`}>
                      <div className="flex justify-between items-center mb-2">
                        <label className="block text-sm font-medium text-slate-700">Refuerzo 1</label>
                        {plan[activeDay]?.R1 && <input type="checkbox" checked={plan[activeDay]?.completed?.R1 || false} onChange={() => handleMealCheck(activeDay, 'R1')} className="w-5 h-5 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer" />}
                      </div>
                      <select value={plan[activeDay]?.R1 || ''} onChange={(e) => handleSelectChange(activeDay, 'R1', e.target.value)} className="block w-full text-sm border-slate-200 rounded-md shadow-sm focus:border-amber-500 focus:ring-amber-500 bg-white">
                        {DIET_OPTIONS.refuerzos.map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
                      </select>
                    </div>
                    <div className={`bg-amber-50/50 p-4 rounded-lg border transition-all ${plan[activeDay]?.completed?.R2 ? 'border-amber-300 opacity-70' : 'border-amber-100'}`}>
                      <div className="flex justify-between items-center mb-2">
                        <label className="block text-sm font-medium text-slate-700">Refuerzo 2</label>
                        {plan[activeDay]?.R2 && <input type="checkbox" checked={plan[activeDay]?.completed?.R2 || false} onChange={() => handleMealCheck(activeDay, 'R2')} className="w-5 h-5 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer" />}
                      </div>
                      <select value={plan[activeDay]?.R2 || ''} onChange={(e) => handleSelectChange(activeDay, 'R2', e.target.value)} className="block w-full text-sm border-slate-200 rounded-md shadow-sm focus:border-amber-500 focus:ring-amber-500 bg-white">
                        {DIET_OPTIONS.refuerzos.map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: LISTA DE COMPRAS */}
        {activeTab === 'shopping' && (
          <div className="space-y-6">
            <div className="flex space-x-2 bg-white p-2 rounded-xl shadow-sm border border-slate-200 w-full sm:w-fit mx-auto sm:mx-0 overflow-x-auto">
              <button onClick={() => setShoppingView('general')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${shoppingView === 'general' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>🛒 General (Suma Ambos)</button>
              <button onClick={() => setShoppingView('ADN')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${shoppingView === 'ADN' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-blue-50'}`}>🧑🏻 Solo ADN</button>
              <button onClick={() => setShoppingView('GAP')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${shoppingView === 'GAP' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-500 hover:bg-purple-50'}`}>👩🏻 Solo GAP</button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center border-b border-slate-100 pb-4">
                <ShoppingCart className="h-5 w-5 mr-2 text-emerald-500"/> Compra para Despensa y Congelados
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {['Proteínas', 'Carbohidratos', 'Frutas', 'Verduras', 'Extras'].map(category => {
                  const items = getShoppingList[category];
                  if (!items || items.length === 0) return null;
                  const perecederos = ['Tomate', 'Pepino', 'Banana', 'Papaya', 'Aguacate'];
                  const filteredItems = items.filter(item => !perecederos.includes(item.name));
                  if (filteredItems.length === 0) return null;
                  
                  return (
                    <div key={category} className="bg-slate-50 rounded-lg p-5 border border-slate-100">
                      <div className="flex justify-between items-end border-b border-slate-200 pb-2 mb-4">
                        <h3 className="font-bold text-slate-800">{category}</h3>
                        <div className="flex space-x-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                           <span className="w-16 text-center">1 Sem</span>
                           <span className="w-16 text-center text-emerald-600">15 Días</span>
                        </div>
                      </div>
                      <ul className="space-y-3">
                        {filteredItems.sort((a,b) => a.name.localeCompare(b.name)).map((item, idx) => (
                          <li key={idx} className="flex justify-between text-sm items-center">
                            <span className="text-slate-700 flex items-center"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-2"></span>{item.name}</span>
                            <div className="flex space-x-2">
                              <span className="w-16 text-center font-medium font-mono text-slate-400">{item.qty} {item.unit}</span>
                              <span className="w-16 text-center font-bold font-mono bg-white px-1.5 py-0.5 rounded text-emerald-700 border border-emerald-100 shadow-sm">{item.qty * 2} {item.unit}</span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-bold text-slate-800 mb-2 flex items-center border-b border-slate-100 pb-4">
                <ShoppingCart className="h-5 w-5 mr-2 text-blue-500"/> Compra Semanal (Perecederos)
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-6">
                {['Frutas', 'Verduras', 'Extras'].map(category => {
                  const items = getShoppingList[category];
                  if (!items || items.length === 0) return null;
                  const perecederos = ['Tomate', 'Pepino', 'Banana', 'Papaya', 'Aguacate'];
                  const filteredItems = items.filter(item => perecederos.includes(item.name));
                  if (filteredItems.length === 0) return null;
                  
                  return (
                    <div key={category} className="bg-blue-50/40 rounded-lg p-5 border border-blue-100">
                      <h3 className="font-bold text-slate-800 mb-4 border-b border-blue-200 pb-2">{category}</h3>
                      <ul className="space-y-2">
                        {filteredItems.sort((a,b) => a.name.localeCompare(b.name)).map((item, idx) => (
                          <li key={idx} className="flex justify-between text-sm items-center">
                            <span className="text-slate-700 flex items-center"><span className="w-1.5 h-1.5 rounded-full bg-blue-400 mr-2"></span>{item.name}</span>
                            <span className="font-medium font-mono bg-white px-2 py-0.5 rounded text-slate-600 border border-slate-200 shadow-sm">{item.qty} {item.unit}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}