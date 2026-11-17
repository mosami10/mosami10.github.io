// All copy is written as Sami: plain sentences, no dashes. Numbers come from his reports.
export const CS = {
  '01': {
    acc: '#ff4d1a', stage: 'f1',
    title: 'F1 Brake Cooling', kind: 'Dissertation · individual · 2026',
    sub: 'CFD and conjugate heat transfer in ANSYS Fluent',
    tags: ['ANSYS Fluent', 'CHT', 'k omega SST', 'MRF', 'Inventor'],
    specs: [['109 K', 'Extra disc cooling, scoop vs dome duct'], ['39%', 'Less mass flow than the dome duct'], ['0.82%', 'Grid convergence index'], ['9.7 M', 'Cells in the final mesh'], ['407.6 K', 'Scoop duct equilibrium, dome 516.5 K']],
    problem: 'An F1 brake disc lives or dies by its cooling. I compared three configurations for a 278 mm, 24 vane carbon/carbon disc at 1,500 rpm and 20 m/s: an unducted disc, a three outlet dome duct and a single outlet bellmouth scoop.',
    method: 'I modelled all three in <b>Autodesk Inventor</b> and ranked them by heat transfer coefficient in <b>ANSYS Fluent 2025 R2</b> with k omega SST. A moving reference frame captured disc rotation, then staged <b>conjugate heat transfer</b> resolved the temperature inside the solid disc. I verified the mesh with a three mesh Richardson study and y+ checks before trusting any number.',
    verdict: '<b>The scoop held the disc at 407.6 K, 109 K cooler than the dome duct, on 39% less mass flow.</b> The unducted disc ran away to the 5,000 K solver limit. The grid convergence index was 0.82% on a 9.7 million cell mesh, against 1.40% in the published benchmark. Module mark: 66 (B).',
    imgs: [['nf1-a.jpg', 'Conjugate heat transfer, 712 K peak', 'r'], ['nf1-b.jpg', 'Pathlines through the rotating domain', 'r'], ['nf1-d.jpg', 'Particle tracks, radial outflow', 'r'], ['nf1-c.jpg', 'Velocity magnitude', 'r'], ['nf1-assy-side.jpg', 'Brake assembly, side view', 'c'], ['nf1-assy-section.jpg', 'Brake assembly, section view', 'c'], ['nf1-e.jpg', 'Brake duct geometry in Inventor', 'c'], ['nf1-part.jpg', 'Caliper model', 'c'], ['nf1-disc.jpg', 'Ventilated carbon brake disc', 'c']]
  },
  '02': {
    acc: '#ff4d1a', stage: 'drone',
    title: 'SPIDR Jet Drone Chassis', kind: 'BAE Systems live brief · group lead',
    sub: 'FEA, additive manufacture and physical test',
    tags: ['ANSYS Mechanical', 'FEA', 'PETG', 'Bambu Studio', 'Witness Horizon'],
    specs: [['13.8%', 'Lighter, at 93.48 g'], ['1.54', 'Safety factor'], ['23.4 MPa', 'Peak von Mises stress'], ['4', 'FEA iterations I ran'], ['42 → 500', 'Units a month in the production model']],
    problem: 'BAE Systems set our group a jet powered hybrid drone chassis: make it lighter without losing strength, and prove it can be manufactured. I led the group, split the work and ran our meetings.',
    method: 'I ran the four <b>ANSYS Mechanical</b> FEA iterations myself under weight and impact load cases. A full lattice PLA concept failed its structural checks, so we dropped it and moved to a selective lattice in PETG. We checked manufacture with ANSYS Additive Print and Bambu Studio, and modelled production in <b>Witness Horizon</b>.',
    verdict: '<b>The final chassis was 13.8% lighter at 93.48 g, with a safety factor of 1.54.</b> We compression tested printed parts on a Tinius Olsen machine. I led our pitch to BAE Systems and pulled together the technical report. Module mark: 70 (A).',
    imgs: [['nspdr.jpg', 'SPIDR Jet, full assembly', 'c'], ['cae-a.jpg', 'Lattice chassis concept', 'c']]
  },
  '03': {
    acc: '#ff4d1a', stage: 'hvac',
    title: 'Automotive HVAC Duct', kind: 'Individual',
    sub: 'Six CAD and CFD loops, then a Simulink cabin model',
    tags: ['Fluent', 'ANSYS Discovery', 'Poly hexcore', 'Simulink', 'Simscape'],
    specs: [['27%', 'Lower pressure drop'], ['145 Pa', 'Pressure drop, down from 199 Pa'], ['50/50', 'Outlet flow split'], ['6', 'CAD and CFD loops']],
    problem: 'Cabin airflow fails when one vent takes most of the air. With the duct envelope fixed by packaging, the inside had to deliver a balanced split to both outlets at an acceptable pressure drop.',
    method: 'I screened ideas quickly in <b>ANSYS Discovery</b>, then ran detailed <b>Fluent</b> analysis on a poly hexcore mesh and reworked the routing each time. I linked the CFD results to a <b>Simulink and Simscape</b> cabin heating model.',
    verdict: '<b>Pressure drop fell 27%, from about 199 Pa to about 145 Pa,</b> and the outlet split reached about 50/50. Peak velocity of about 26 m/s was still over the limit, so I set it as the constraint for the next loop instead of hiding it.',
    imgs: [['hvac-a.jpg', 'Duct geometry, final routing', 'c'], ['hvac-c.jpg', 'Packaging envelope and outlets', 'c'], ['hvac-b.jpg', 'Simulink and Simscape cabin model', 'r']]
  },
  '04': {
    acc: '#ff4d1a',
    title: 'Hybrid Drone Redesign', kind: 'Design for manufacture and assembly',
    sub: 'Fewer parts, 360 degree leg rotation, stress checked',
    tags: ['Inventor', 'DfMA', 'Static Structural', 'Additive'],
    specs: [['360°', 'Leg rotation'], ['Fewer', 'Assembly steps'], ['FEA', 'Original vs redesign']],
    problem: 'The original hybrid drone body was slow to assemble and unproven where it mattered. The redesign had to cut assembly effort and improve the structure at the same time.',
    method: 'I redesigned the body in <b>Inventor</b> around design for manufacture and assembly: fewer parts, snap fit joints and alignment features, all within additive manufacturing limits. A new 360 degree leg rotation mechanism added landing options. I compared both bodies in <b>ANSYS Static Structural</b>.',
    verdict: 'Fewer assembly steps, simpler joints, and <b>FEA showed a better stress distribution</b> than the original design.',
    imgs: [['cae-e.jpg', 'Chassis stress plot', 'r'], ['cae-f.jpg', 'Chassis stress plot, second plot', 'r'], ['cae-d.jpg', 'Lattice layout, top view', 'c']]
  },
  '05': {
    acc: '#ff4d1a',
    title: 'CFRP Leaf Spring', kind: 'Individual · module mark 73 (A)',
    sub: 'Steel against carbon fibre, FEA checked in the lab',
    tags: ['ANSYS', 'CFRP', 'Tensile test', 'Vibration test'],
    specs: [['80%', 'Lower density than steel'], ['73', 'Module mark, grade A'], ['FEA + lab', 'Checked twice']],
    problem: 'Steel leaf springs give the stiffness but carry a mass penalty. Could a carbon fibre composite hit the same stiffness, and could the simulation be trusted without physical evidence?',
    method: 'I modelled the spring in <b>Inventor</b> and analysed stress, deformation and safety factor in ANSYS with both materials. Then I took it into the lab for <b>tensile and vibration testing</b> and compared the results with the FEA.',
    verdict: '<b>The CFRP design met the target stiffness at about 80% lower density,</b> and the FEA held up against the lab measurements. Cost is the trade off.',
    imgs: [['leaf-a.jpg', 'Leaf spring FEA, deformation', 'r'], ['leaf-b.jpg', 'Leaf spring model in Inventor', 'c']]
  },
  '06': {
    acc: '#ff4d1a',
    title: 'Wind Turbine Blade Fatigue', kind: 'Individual report',
    sub: 'NREL 5 MW blade life from wind statistics',
    tags: ['QBlade', 'Weibull', 'Goodman', "Miner's rule", 'Excel'],
    specs: [['6', 'Operating points'], ['5 MW', 'NREL reference turbine'], ['S N', 'Goodman corrected curves']],
    problem: 'Turbine blades rarely fail from one extreme load. They fail from years of accumulated cycles. Which case really governs the blade?',
    method: 'I analysed blade loading in <b>QBlade</b> at six operating points, then applied Weibull wind loading, Goodman corrected S N curves and <b>Miner\'s rule</b> to add up the damage.',
    verdict: 'I found the governing case and <b>estimated blade life from cumulative damage</b>: a full chain from aerodynamics to fatigue.',
    imgs: [['wt-d.jpg', 'Blade stress result', 'r'], ['wt-b.jpg', 'QBlade result plot', 'r'], ['wt-a.jpg', 'QBlade turbine model', 'c'], ['wt-c.jpg', 'Blade loading diagram', 'c']]
  },
  '07': {
    acc: '#ff4d1a',
    title: 'Control Modelling', kind: 'MATLAB and Simulink',
    sub: 'Root locus and PID, checked against step response targets',
    tags: ['MATLAB', 'Simulink', 'Root locus', 'PID', 'Bode'],
    specs: [['4', 'Systems modelled'], ['PI / PID', 'Controllers tuned'], ['Met', 'Step response targets']],
    problem: 'Model four physical systems from first principles, mechanical and electrical, and tune a DC motor speed controller to meet set step response targets.',
    method: 'I derived mass spring damper and RLC transfer functions from Newton\'s and Kirchhoff\'s laws, analysed steady state error, designed a compensator by <b>root locus</b>, then tuned PI and PID control on a DC motor model in MATLAB.',
    verdict: 'The DC motor speed controller <b>met its step response targets</b>.',
    imgs: []
  },
  '08': {
    acc: '#ff4d1a',
    title: 'Mechatronic Strawberry Cutter', kind: 'Group project',
    sub: 'From CAD to a working prototype',
    tags: ['Arduino', 'Multisim', 'Inventor', 'Workshop'],
    specs: [['Built', 'Working prototype'], ['Arduino', 'Control'], ['Multisim', 'Circuit design']],
    problem: 'As a group we had to design and build an automated strawberry cutting mechanism, with mechanical design, electronics and control in one working machine.',
    method: 'We designed the mechanism in <b>Inventor</b>, the circuit in <b>Multisim</b> and the control logic on <b>Arduino</b>, then manufactured, assembled and commissioned the prototype in the workshop.',
    verdict: 'A <b>working prototype, built and tested through full cutting cycles</b>. It showed me how a design changes once you have to make it work.',
    imgs: []
  },
  '09': {
    acc: '#ff4d1a',
    title: 'Steam Pipe Integrity', kind: 'Group',
    sub: 'Creep, fracture and an inspection plan',
    tags: ['Larson Miller', 'Fracture mechanics', 'EN8 vs P91', 'PAUT'],
    specs: [['EN8 vs P91', 'Steels compared'], ['PAUT', 'Inspection method chosen'], ['3', 'Damage mechanisms']],
    problem: 'High temperature steam pipes collect creep, fatigue and crack growth at the same time. We had to compare two steels and choose how to inspect the pipe in service.',
    method: 'We compared EN8 and P91 steel using fracture mechanics (Harrison\'s criterion) and creep life by the <b>Larson Miller</b> parameter, then ran a trade study of inspection methods.',
    verdict: 'We recommended <b>phased array ultrasonic testing</b> and presented the case as a group.',
    imgs: []
  }
};
export const ORDER = ['01', '02', '03', '04', '05', '06', '07', '08', '09'];

// Telemetry strip: real numbers from the project in view.
export const HUD = {
  hero: [['U', '20 m/s'], ['N', '1,500 rpm'], ['T peak', '712 K'], ['GCI', '0.82%']],
  f1: [['Disc', '278 mm · 24 vane'], ['Mesh', '9.7 M cells'], ['ΔT', '109 K'], ['GCI', '0.82%']],
  drone: [['Mass', '93.48 g'], ['Saving', '13.8%'], ['σ max', '23.4 MPa'], ['SF', '1.54']],
  hvac: [['ΔP in', '199 Pa'], ['ΔP out', '145 Pa'], ['Split', '50/50'], ['Loops', '6']],
  free: [['BEng', '2:1'], ['Base', 'Chelmsford'], ['Status', 'Open to work'], ['Year', '2026']]
};

export const RATIO = {"leaf-a.jpg": 2.01, "nf1-d.jpg": 0.916, "hvac-a.jpg": 1.905, "nf1-a.jpg": 1.242, "wt-c.jpg": 1.418, "nf1-e.jpg": 1.176, "hvac-c.jpg": 3.194, "cae-a.jpg": 1.242, "nf1-disc.jpg": 0.608, "wt-b.jpg": 1.584, "cae-e.jpg": 1.221, "cae-f.jpg": 1.197, "hvac-b.jpg": 1.287, "cae-d.jpg": 1.323, "nf1-b.jpg": 1.616, "wt-a.jpg": 1.747, "nf1-c.jpg": 1.01, "wt-d.jpg": 1.37, "leaf-b.jpg": 1.99, "nf1-assy-side.jpg": 1.48, "nf1-part.jpg": 1.38, "nf1-assy-section.jpg": 1.49, "nspdr.jpg": 1.816};
