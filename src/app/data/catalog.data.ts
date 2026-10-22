/**
 * Planes de estudios de la Universidad Continental incluidos en la app.
 * Fuente: páginas oficiales "Plan de estudios" de cada carrera en ucontinental.edu.pe
 * (consultadas en octubre de 2026). Los planes pueden cambiar: verifica siempre en la web oficial.
 * Formato: "# ciclo" y luego "Curso | créditos" (el mismo que acepta el importador).
 */
import { Career } from '../models/catalog.model';
import { parsePlan } from '../utils/plan-parser';

const SISTEMAS = `
# 1
Comprensión y Producción de Textos 1 | 3
Laboratorio de Liderazgo e Innovación | 3
Estrategias y Herramientas Digitales para el Aprendizaje | 4
Matemática Básica | 4
Matemática Discreta 1 | 4
Técnicas de Programación | 2
Introducción a la Ingeniería de Sistemas e Informática | 3
# 2
Comprensión y Producción de Textos 2 | 4
Electivo General 1 | 3
Álgebra Lineal y Geometría Analítica | 4
Modelado de Negocios | 3
Matemática Superior | 4
Matemática Discreta 2 | 4
Programación Orientada a Objetos | 2
# 3
Estadística y Probabilidades | 4
Electivo General 2 | 3
Laboratorio de Liderazgo e Innovación Intermedio | 2
Cálculo Diferencial | 4
Física 1 | 4
Base de Datos 1 | 3
Diseño Web | 2
Estructura de Datos | 2
# 4
Electivo General 3 | 3
Electivo General 4 | 3
English Course 1 | 3
Cálculo Integral | 4
Física Electromagnética | 4
Análisis y Diseño de Software | 4
Programación Web | 2
# 5
English Course 2 | 3
Laboratorio de Liderazgo e Innovación Avanzado | 3
Ecuaciones Diferenciales | 4
Estadística para Ingeniería | 3
Desarrollo de Aplicaciones Web | 2
Base de Datos 2 | 3
Arquitectura del Computador | 3
# 6
Investigación Académica | 3
English Course 3 | 3
Investigación Operativa 1 | 4
Métodos Numéricos | 4
Desarrollo de Videojuegos | 4
Sistemas Operativos | 4
# 7
English Course 4 | 3
Electivo General 5 | 1
Ingeniería Económica | 3
Redes de Computadoras | 4
Ingeniería de Software | 4
Proyectos de Innovación | 2
Fundamentos de Sistemas Dinámicos y Modelado | 3
Construcción y Pruebas de Software | 4
# 8
Simulación de Procesos | 3
Gestión de Proyectos en Ingeniería | 3
Conmutación y Enrutamiento | 4
Desarrollo de Aplicaciones Móviles | 4
Arquitectura de Software | 3
Metodologías Ágiles para el Desarrollo de Software | 3
# 9
Electivo Transversal o de Especialidad 1 | 3
Taller de Investigación 1 en Ingeniería de Sistemas e Informática | 4
Proyectos de Diseño en Ingeniería de Sistemas e Informática | 4
Inteligencia de Negocios y Ciencia de Datos | 4
Seguridad de la Información | 3
Aplicaciones Cloud | 2
# 10
Taller de Investigación 2 en Ingeniería de Sistemas e Informática | 4
Proyectos de Diseño y Desarrollo en Ingeniería de Sistemas e Informática | 4
Auditoría de Sistemas | 3
Robótica y Machine Learning | 2
Planificación y Gestión de Tecnologías de la Información | 3
Electivo Transversal o de Especialidad 2 | 3
`;

const DERECHO = `
# 1
Comprensión y Producción de Textos 1 | 3
Laboratorio de Liderazgo e Innovación | 3
Estrategias y Herramientas Digitales para el Aprendizaje | 4
Fundamentos de Matemática | 4
Introducción al Derecho | 3
Antropología y Sociología Jurídica | 5
# 2
Comprensión y Producción de Textos 2 | 4
Derecho Constitucional I | 4
Historia del Derecho y Derecho Romano | 4
Derecho de Personas | 3
Electivo General 1 | 3
Electivo Transversal 1 | 4
# 3
Estadística y Probabilidades | 4
Laboratorio de Liderazgo e Innovación Intermedio | 2
Derecho Penal: Parte General | 4
Derecho Constitucional II | 4
Acto Jurídico | 4
Electivo General 2 | 3
# 4
English Course 1 | 3
Derecho Procesal Constitucional | 4
Teoría General del Proceso | 4
Derecho Penal: Parte Especial I | 4
Electivo General 3 | 3
Electivo General 4 | 3
# 5
English Course 2 | 3
Laboratorio de Liderazgo e Innovación Avanzado | 3
Obligaciones | 4
Derecho Penal: Parte Especial II | 3
Deontología Jurídica | 3
Derecho Procesal Civil I | 4
# 6
Investigación Académica | 3
English Course 3 | 3
Reales | 4
Derecho Procesal Civil II | 4
Derecho Procesal Penal I | 3
Fundamentos Económicos y Contables | 4
# 7
English Course 4 | 3
Derecho Laboral I | 4
Derecho Administrativo | 3
Contratos | 4
Análisis Económico del Derecho | 3
Filosofía del Derecho | 4
Electivo General 5 | 1
# 8
Derecho Procesal Penal II | 4
Derecho Procesal Administrativo | 3
Derecho Laboral II | 3
Derecho de Familia | 3
Derecho Societario y Corporativo | 4
Mecanismos Alternativos para la Resolución de Conflictos | 3
# 9
Derecho Tributario I | 4
Derecho de Sucesiones | 3
Derecho Procesal Laboral | 4
Litigación Oral | 4
Notariado y Registro Público | 4
Electivo Transversal o de Especialidad 1 | 3
# 10
Razonamiento y Argumentación Jurídica | 4
Derecho Internacional Público | 3
Derecho Tributario II | 4
Contrataciones con el Estado | 3
Derecho de la Competencia y del Consumo | 4
Electivo Transversal o de Especialidad 2 | 3
# 11
Taller de Investigación 1 Derecho | 4
Seminario de Penal y Procesal Penal | 3
Derecho de la Regulación | 3
Comercio Internacional | 3
Seminario de Responsabilidad Civil | 4
Electivo de Especialidad 3 | 3
# 12
Taller de Investigación 2 Derecho | 4
Derecho Ambiental y de Minería | 4
Cibercrimen y Delitos Informáticos | 3
Derecho Internacional Privado | 3
Seminario de Civil y Procesal Civil | 3
Derechos Humanos y Derecho Comunitario | 3
`;

const INDUSTRIAL = `
# 1
Comprensión y Producción de Textos 1 | 3
Laboratorio de Liderazgo e Innovación | 3
Estrategias y Herramientas Digitales para el Aprendizaje | 4
Matemática Básica | 4
Química 1 | 4
Digital Transformation | 2
Introducción a la Ingeniería Industrial | 3
# 2
Comprensión y Producción de Textos 2 | 4
Electivo General 1 | 3
Álgebra Lineal y Geometría Analítica | 4
Dibujo en Ingeniería | 4
Programación Aplicada | 3
Matemática Superior | 4
# 3
Estadística y Probabilidades | 4
Electivo General 2 | 3
Laboratorio de Liderazgo e Innovación Intermedio | 2
Cálculo Diferencial | 4
Física 1 | 4
Prototipado 3D | 4
# 4
Electivo General 3 | 3
Electivo General 4 | 3
English Course 1 | 3
Cálculo Integral | 4
Física 2 | 4
Mecánica y Resistencia de Materiales | 4
Economía General | 2
# 5
Laboratorio de Liderazgo e Innovación Avanzado | 3
Ecuaciones Diferenciales | 4
Tecnología de Materiales | 2
Contabilidad Financiera | 2
Ingeniería Eléctrica y Electrónica | 4
Estudio del Trabajo 1 | 3
Marketing Digital | 2
English Course 2 | 3
# 6
Investigación Académica | 4
English Course 3 | 3
Ingeniería Económica | 2
Investigación Operativa 1 | 4
Termofluidos | 4
Estudio del Trabajo 2 | 4
# 7
English Course 4 | 3
Electivo General 5 | 1
Seguridad y Salud Ocupacional | 3
Investigación Operativa 2 | 4
Procesos de Manufactura | 3
Costos y Presupuestos para Ingeniería Industrial | 3
Máquinas e Instrumentos | 4
# 8
Estadística Aplicada a Procesos | 3
Economía Circular | 3
Gestión de la Calidad | 3
Gestión de la Cadena de Suministros | 4
Formulación y Evaluación de Proyectos de Inversión | 3
Gestión Integral de Mantenimiento | 3
Electivo de Especialidad 1 | 3
# 9
Simulación de Procesos | 3
Gestión de Proyectos en Ingeniería | 3
Taller de Investigación 1 en Ingeniería Industrial | 4
Gestión de Operaciones | 3
Diseño de Instalaciones | 2
Planeamiento y Control de la Producción | 2
Electivo de Especialidad 2 o Electivo Interdisciplinario 1 | 3
# 10
Proyecto Integrador | 3
Automatización Industrial | 4
Taller de Investigación 2 en Ingeniería Industrial | 4
Gestión del Talento Humano Organizacional | 3
Gerencia Estratégica | 2
Taller de Procesos | 2
Electivo de Especialidad 3 o Electivo Interdisciplinario 2 | 3
`;

const uc = (id: string, name: string, faculty: string, plan: string): Career =>
  ({ id, name, faculty, source: 'uc', cycles: parsePlan(plan) });

export const BUILTIN_CAREERS: Career[] = [
  uc('sistemas', 'Ingeniería de Sistemas e Informática', 'Facultad de Ingeniería', SISTEMAS),
  uc('industrial', 'Ingeniería Industrial', 'Facultad de Ingeniería', INDUSTRIAL),
  uc('derecho', 'Derecho', 'Facultad de Derecho', DERECHO),
];
