const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('www'));

const DATA_FILE = path.join(__dirname, 'data.json');

const readData = () => {
    try {
        if (!fs.existsSync(DATA_FILE)) {
            const defaultData = {
                player: {
                    xp: 0,
                    level: 1,
                    streak: 0,
                    lastLogin: new Date().toDateString(),
                    stats: { strength: 5, discipline: 5, knowledge: 5, money: 0 }
                },
                baseQuests: [
                    { id: '1', title: 'Morning Workout', xp: 15, completed: false, statRewards: { strength: 2, discipline: 1 } },
                    { id: '2', title: 'Read 30 minutes', xp: 10, completed: false, statRewards: { knowledge: 2 } },
                    { id: '3', title: 'Meditate', xp: 10, completed: false, statRewards: { discipline: 2 } },
                    { id: '4', title: 'Deep Work Session', xp: 25, completed: false, statRewards: { discipline: 2, knowledge: 1 } }
                ],
                aiQuests: [],
                panelItems: {
                    left: ['Neural pathways strengthening...', 'Synaptic connections optimized', 'Cognitive load balanced'],
                    right: ['Tip: Break tasks into atoms', 'Insight: Consistency beats intensity', 'Data: 1% daily = 37x yearly']
                }
            };
            fs.writeFileSync(DATA_FILE, JSON.stringify(defaultData, null, 2));
            return defaultData;
        }
        return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    } catch (err) {
        console.error('Read error:', err);
        return null;
    }
};

const writeData = (data) => {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
        return true;
    } catch (err) {
        console.error('Write error:', err);
        return false;
    }
};

app.get('/api/game-data', (req, res) => {
    const data = readData();
    if (!data) return res.status(500).json({ error: 'Failed to load' });
    
    const today = new Date().toDateString();
    if (data.player.lastLogin !== today) {
        data.player.streak++;
        data.player.lastLogin = today;
        data.baseQuests.forEach(q => q.completed = false);
        writeData(data);
    }
    res.json(data);
});

app.post('/api/complete-quest', (req, res) => {
    const { questId } = req.body;
    const data = readData();
    const quest = [...data.baseQuests, ...data.aiQuests].find(q => q.id === questId);
    if (!quest || quest.completed) return res.status(400).json({ error: 'Invalid quest' });
    
    quest.completed = true;
    data.player.xp += quest.xp;
    
    let xpNeeded = 0;
    for (let i = 1; i <= data.player.level; i++) xpNeeded += i * 100;
    while (data.player.xp >= xpNeeded) {
        data.player.level++;
        xpNeeded += data.player.level * 100;
    }
    
    if (quest.statRewards) {
        Object.entries(quest.statRewards).forEach(([stat, val]) => {
            if (data.player.stats[stat] !== undefined) data.player.stats[stat] += val;
        });
    }
    writeData(data);
    res.json({ success: true, player: data.player });
});

app.post('/api/reset-dailies', (req, res) => {
    const data = readData();
    data.baseQuests.forEach(q => q.completed = false);
    writeData(data);
    res.json({ success: true });
});

app.post('/api/add-xp', (req, res) => {
    const { amount } = req.body;
    const data = readData();
    data.player.xp += amount;
    let xpNeeded = 0;
    for (let i = 1; i <= data.player.level; i++) xpNeeded += i * 100;
    while (data.player.xp >= xpNeeded) {
        data.player.level++;
        xpNeeded += data.player.level * 100;
    }
    writeData(data);
    res.json({ success: true, player: data.player });
});

app.post('/api/delete-quest-request', (req, res) => {
    const { questId, reason } = req.body;
    const data = readData();
    const lower = reason.toLowerCase();
    const valid = ['injur', 'sick', 'emergency', 'family', 'health', 'doctor', 'pain'];
    const invalid = ['lazy', 'bored', 'tired', 'dont want', 'forget'];
    
    const isValid = valid.some(e => lower.includes(e));
    const isInvalid = invalid.some(e => lower.includes(e));
    
    if (isInvalid) return res.json({ approved: false, message: 'Request denied. Insufficient justification.' });
    if (isValid || reason.length > 30) {
        data.baseQuests = data.baseQuests.filter(q => q.id !== questId);
        data.aiQuests = data.aiQuests.filter(q => q.id !== questId);
        writeData(data);
        return res.json({ approved: true, message: 'Request approved. Quest removed.' });
    }
    res.json({ approved: false, message: 'Request under review. Provide more details.' });
});

app.post('/api/plan', (req, res) => {
    const { text } = req.body;
    const data = readData();
    const lower = text.toLowerCase();
    const category = lower.match(/weight|exercise|gym|workout/) ? 'fitness' :
                     lower.match(/code|program|javascript|python/) ? 'coding' :
                     lower.match(/money|finance|invest|business/) ? 'finance' :
                     lower.match(/mindset|focus|discipline|habit/) ? 'mental' : 'general';
    
    const plans = {
        fitness: {
            main_goal: 'Transform physical capabilities through systematic training',
            urgent_tasks: ['Schedule 3 workouts', 'Remove junk food', 'Set sleep alarm'],
            next_steps: ['Find workout program', 'Track calories', 'Get gym membership'],
            habits: ['Morning mobility', 'Protein every meal', 'Daily 10k steps'],
            warnings: ['Avoid overtraining', 'Don\'t compare to others'],
            aiQuests: [
                { id: Date.now().toString(), title: 'Complete workout circuit', xp: 25, completed: false, statRewards: { strength: 3, discipline: 2 } },
                { id: (Date.now()+1).toString(), title: 'Meal prep healthy food', xp: 15, completed: false, statRewards: { discipline: 2 } }
            ]
        },
        coding: {
            main_goal: 'Master software engineering through deliberate practice',
            urgent_tasks: ['Setup dev environment', 'Choose project to build', 'Block 2h deep work'],
            next_steps: ['Complete tutorial', 'Build todo app', 'Deploy to internet'],
            habits: ['Code before email', 'Read docs daily', 'Contribute to open source'],
            warnings: ['Tutorial hell is real', 'Don\'t optimize prematurely'],
            aiQuests: [
                { id: Date.now().toString(), title: 'Complete coding challenge', xp: 20, completed: false, statRewards: { knowledge: 3, discipline: 1 } },
                { id: (Date.now()+1).toString(), title: 'Build a feature', xp: 30, completed: false, statRewards: { knowledge: 2, discipline: 2 } }
            ]
        },
        finance: {
            main_goal: 'Build wealth through disciplined financial engineering',
            urgent_tasks: ['Track expenses 7 days', 'Cancel unused subscriptions', 'Auto-transfer to savings'],
            next_steps: ['Create budget categories', 'Research index funds', 'Start side income'],
            habits: ['Review finances weekly', 'Read financial article', 'Negotiate bills monthly'],
            warnings: ['Avoid get-rich-quick schemes', 'Don\'t invest money you can\'t lose'],
            aiQuests: [
                { id: Date.now().toString(), title: 'Review and optimize budget', xp: 15, completed: false, statRewards: { discipline: 2, knowledge: 1 } },
                { id: (Date.now()+1).toString(), title: 'Research investment', xp: 10, completed: false, statRewards: { knowledge: 2 } }
            ]
        },
        mental: {
            main_goal: 'Forge unbreakable mental architecture',
            urgent_tasks: ['Identify top 3 distractions', 'Create morning routine', 'Phone grayscale'],
            next_steps: ['Practice 10min meditation', 'Journal daily for week', 'Find accountability partner'],
            habits: ['Morning pages', 'Digital sunset 9pm', 'Weekly review'],
            warnings: ['Perfectionism is procrastination', 'Rest is not laziness'],
            aiQuests: [
                { id: Date.now().toString(), title: 'Meditate 10 minutes', xp: 15, completed: false, statRewards: { discipline: 2, knowledge: 1 } },
                { id: (Date.now()+1).toString(), title: 'Deep work session', xp: 25, completed: false, statRewards: { discipline: 3 } }
            ]
        },
        general: {
            main_goal: 'Systematic self-improvement across all domains',
            urgent_tasks: ['Audit time usage', 'Define clear objective', 'Remove bad habit trigger'],
            next_steps: ['Create morning ritual', 'Set weekly review', 'Find mentor/community'],
            habits: ['Daily reflection', 'Continuous learning', 'Physical movement'],
            warnings: ['Don\'t change everything at once', 'Consistency beats intensity'],
            aiQuests: [
                { id: Date.now().toString(), title: 'Complete priority task', xp: 20, completed: false, statRewards: { discipline: 2 } },
                { id: (Date.now()+1).toString(), title: 'Learn something new', xp: 15, completed: false, statRewards: { knowledge: 2 } }
            ]
        }
    };
    
    const plan = plans[category];
    data.aiQuests = plan.aiQuests;
    writeData(data);
    res.json(plan);
});

app.post('/api/teacher-button', (req, res) => {
    console.log('Learning:', req.body);
    res.json({ success: true });
});

app.listen(PORT, () => console.log(`Server on port ${PORT}`));