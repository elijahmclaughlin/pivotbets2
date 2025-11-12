// main.js

document.addEventListener('DOMContentLoaded', () => {
    // API is hosted on the same domain, so we use a relative path
    const API_BASE_URL = '/api'; 
    const contentArea = document.getElementById('app-content');
    const LEAGUES = {
        'nfl': 'NFL',
        'nba': 'NBA',
        'cfb': 'College Football',
        'mbb': "Men's College Basketball"
    };

    // --- Event Listeners for Tabs ---
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', (e) => {
            const league = e.target.dataset.league;
            // Update active tab class
            document.querySelector('.tab-button.active')?.classList.remove('active');
            e.target.classList.add('active');
            loadContent(league);
        });
    });

    // Initial load
    loadContent('home');

    // --- Main Content Loader ---
    function loadContent(league) {
        contentArea.innerHTML = '<p class="loading">Loading ' + league.toUpperCase() + ' Data...</p>';
        if (league === 'home') {
            renderHomePage();
        } else {
            fetchGamePredictions(league);
        }
    }

    // --- Homepage Renderer (Accuracy Headers & Charts) ---
    async function renderHomePage() {
        // Fetch All Accuracy Headers
        let headerHtml = '<h2>Overall Model Accuracy</h2><div class="accuracy-grid">';
        
        const leaguePromises = Object.keys(LEAGUES).map(async (key) => {
            const leagueName = LEAGUES[key];
            const response = await fetch(`${API_BASE_URL}/results/${key}`);
            const data = response.ok ? await response.json() : null;

            headerHtml += `<div class="accuracy-col">
                <h6>${leagueName}</h6>
                <div class="metric-container">
                    <div class="metric">Winner Accuracy <strong>${(data?.moneyline_accuracy || 0).toFixed(1)}%</strong></div>
                    <div class="metric">Spread Accuracy <strong>${(data?.ats_accuracy || 0).toFixed(1)}%</strong></div>
                    <div class="metric">Total Accuracy <strong>${(data?.total_accuracy || 0).toFixed(1)}%</strong></div>
                </div>
            </div>`;
        });
        
        await Promise.all(leaguePromises);
        
        headerHtml += '</div><hr>';
        
        // Fetch Performance Data for Charts
        const performanceResponse = await fetch(`${API_BASE_URL}/dashboard/performance`);
        const performanceData = performanceResponse.ok ? await performanceResponse.json() : [];

        // Combine HTML and Chart Containers
        let chartHtml = `
            <h2>Historical Model Performance: Accuracy and Profit</h2>
            <div class="chart-container">
                <h5>Cumulative Moneyline Profit (Units)</h5>
                <canvas id="profitChart"></canvas>
            </div>
            <hr>
            <div class="chart-container">
                <h5>Weekly Moneyline Win Percentage</h5>
                <canvas id="accuracyChart"></canvas>
            </div>
        `;
        
        contentArea.innerHTML = headerHtml + chartHtml;
        
        if (performanceData.length > 0) {
            renderCharts(performanceData);
        } else {
            document.querySelector('.chart-container').innerHTML = '<p class="info">No historical performance data available.</p>';
        }
    }

    // --- Chart Renderer (Using Chart.js) ---
    function renderCharts(data) {
        const labels = Array.from(new Set(data.map(d => d.game_week_start.split('T')[0]))).sort();
        const leagues = Array.from(new Set(data.map(d => d.league)));
        
        // Helper to get datasets for a specific metric
        const getDatasets = (metric, factor = 1) => {
            return leagues.map(league => {
                const leagueData = data.filter(d => d.league === league);
                const chartData = labels.map(label => {
                    const row = leagueData.find(d => d.game_week_start.startsWith(label));
                    return row ? row[metric] * factor : null;
                });
                return {
                    label: league,
                    data: chartData,
                    borderColor: getRandomColor(),
                    tension: 0.1,
                    fill: false
                };
            });
        };

        // 1. Profit Chart
        new Chart(document.getElementById('profitChart'), {
            type: 'line',
            data: {
                labels: labels,
                datasets: getDatasets('cumulative_win_profit')
            }
        });

        // 2. Accuracy Chart
        new Chart(document.getElementById('accuracyChart'), {
            type: 'line',
            data: {
                labels: labels,
                datasets: getDatasets('weekly_win_pct', 100)
            }
        });
        
        // Simple color generator
        function getRandomColor() {
            const letters = '0123456789ABCDEF';
            let color = '#';
            for (let i = 0; i < 6; i++) {
                color += letters[Math.floor(Math.random() * 16)];
            }
            return color;
        }
    }

    // --- Game Predictions Renderer ---
    async function fetchGamePredictions(league) {
        try {
            const response = await fetch(`${API_BASE_URL}/games/${league}`);
            if (!response.ok) throw new Error('Network response was not ok');
            const games = await response.json();
            renderGamePredictions(LEAGUES[league], games);
        } catch (error) {
            contentArea.innerHTML = `<p class="error">Error loading ${LEAGUES[league]} games: ${error.message}</p>`;
        }
    }

    function renderGamePredictions(leagueName, games) {
        if (games.length === 0) {
            contentArea.innerHTML = `<p class="info">No predictions available for ${leagueName}.</p>`;
            return;
        }

        let html = `<h2>${leagueName} Game Predictions</h2><hr>`;
        html += '<div class="game-cards-container">'; 

        games.forEach(row => {
            // Note: row.gameday_formatted is available because we pre-formatted it in data_handler.py
            
            // Build the card HTML (recreating st.container(border=True) logic)
            html += `
                <div class="game-card">
                    <h3 class="card-title">${row.away_team_name} @ ${row.home_team_name}</h3>
                    <p class="gameday">Gameday: <strong>${row.gameday_formatted || 'N/A'}</strong></p>
                    <div class="scores-metrics-grid">
                        <div class="team-metrics">
                            <h5>${row.away_team}</h5>
                            <div class="metric">Projected Score <strong>${(row.away_sim_points || 0).toFixed(1)}</strong></div>
                            <div class="metric">Moneyline Odds <strong>${row.away_ml || 'N/A'}</strong></div>
                            <div class="metric">Away Spread <strong>${row.away_spread || 'N/A'}</strong></div>
                            <div class="metric">Total Under <strong>${row.total_under || 'N/A'}</strong></div>
                        </div>
                        <div class="team-metrics">
                            <h5>${row.home_team}</h5>
                            <div class="metric">Projected Score <strong>${(row.home_sim_points || 0).toFixed(1)}</strong></div>
                            <div class="metric">Moneyline Odds <strong>${row.home_ml || 'N/A'}</strong></div>
                            <div class="metric">Home Spread <strong>${row.home_spread || 'N/A'}</strong></div>
                            <div class="metric">Total Over <strong>${row.total_over || 'N/A'}</strong></div>
                        </div>
                    </div>
                    <div class="predictions">
                        <p class="prediction-result winner">Winner: <strong>${row.pred_winner}</strong> | ${row.pred_wp} Win Probability</p>
                        <p class="prediction-result cover">Cover: <strong>${row.pred_cover_team}</strong> | ${row.pred_ats_prob} Cover Probability</p>
                        <p class="prediction-result total">Total: <strong>${row.pred_total_name}</strong> | ${row.pred_ou_prob} O/U Probability</p>
                    </div>
                    </div>
            `;
        });

        html += '</div>';
        contentArea.innerHTML = html;
    }
});