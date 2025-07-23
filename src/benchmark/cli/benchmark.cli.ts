import { Command } from 'commander';
import { NestFactory } from '@nestjs/core';
import { BenchmarkModule } from '../benchmark.module';
import { BenchmarkService } from '../services/benchmark.service';

async function runBenchmarkCLI() {
  const program = new Command();
  
  program
    .name('benchmark-cli')
    .description('CLI for running matching algorithm benchmarks')
    .version('1.0.0');

  program
    .command('run')
    .description('Run comprehensive benchmark suite')
    .option('-o, --output <file>', 'Output file for results (JSON)', 'benchmark-results.json')
    .option('-f, --format <format>', 'Output format (json|csv|html)', 'json')
    .action(async (options) => {
      console.log('🚀 Starting Matching Algorithm Benchmark Suite...\n');
      
      const app = await NestFactory.createApplicationContext(BenchmarkModule);
      const benchmarkService = app.get(BenchmarkService);
      
      try {
        const results = await benchmarkService.runComprehensiveBenchmark();
        
        // Save results based on format
        const fs = require('fs');
        
        if (options.format === 'json') {
          fs.writeFileSync(options.output, JSON.stringify(results, null, 2));
        } else if (options.format === 'csv') {
          const csv = convertToCSV(results.results);
          fs.writeFileSync(options.output.replace('.json', '.csv'), csv);
        } else if (options.format === 'html') {
          const html = generateHTMLReport(results);
          fs.writeFileSync(options.output.replace('.json', '.html'), html);
        }
        
        console.log('\n📊 Benchmark Results Summary:');
        console.log('=' .repeat(50));
        
        // Display summary
        for (const [algorithm, stats] of Object.entries(results.summary.algorithmStats)) {
          console.log(`\n${algorithm}:`);
          console.log(`  Avg Execution Time: ${(stats as any).avgExecutionTime.toFixed(2)}ms`);
          console.log(`  Avg Memory Usage: ${((stats as any).avgMemoryUsage / 1024 / 1024).toFixed(2)}MB`);
          console.log(`  Avg Accuracy: ${(stats as any).avgAccuracy.toFixed(2)}%`);
          console.log(`  Avg Throughput: ${(stats as any).avgThroughput.toFixed(2)} records/sec`);
          console.log(`  Scalability Factor: ${(stats as any).scalability.toFixed(2)}`);
        }
        
        console.log('\n🏆 Recommendations:');
        results.summary.recommendations.forEach((rec: string) => {
          console.log(`  • ${rec}`);
        });
        
        console.log(`\n💾 Results saved to: ${options.output}`);
        
      } catch (error) {
        console.error('❌ Benchmark failed:', error.message);
        process.exit(1);
      } finally {
        await app.close();
      }
    });

  program
    .command('compare')
    .description('Compare two benchmark result files')
    .argument('<file1>', 'First benchmark results file')
    .argument('<file2>', 'Second benchmark results file')
    .action(async (file1, file2) => {
      const fs = require('fs');
      
      try {
        const results1 = JSON.parse(fs.readFileSync(file1, 'utf8'));
        const results2 = JSON.parse(fs.readFileSync(file2, 'utf8'));
        
        console.log('📈 Benchmark Comparison Report');
        console.log('=' .repeat(50));
        
        compareResults(results1, results2);
        
      } catch (error) {
        console.error('❌ Comparison failed:', error.message);
        process.exit(1);
      }
    });

  await program.parseAsync();
}

function convertToCSV(results: any[]): string {
  if (results.length === 0) return '';
  
  const headers = Object.keys(results[0]);
  const csvContent = [
    headers.join(','),
    ...results.map(row => 
      headers.map(header => 
        typeof row[header] === 'string' ? `"${row[header]}"` : row[header]
      ).join(',')
    )
  ].join('\n');
  
  return csvContent;
}

function generateHTMLReport(results: any): string {
  return `
<!DOCTYPE html>
<html>
<head>
    <title>Matching Algorithm Benchmark Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
        h1, h2 { color: #333; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
        th { background-color: #f2f2f2; font-weight: bold; }
        tr:nth-child(even) { background-color: #f9f9f9; }
        .summary { background: #e8f4fd; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .recommendations { background: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .metric { display: inline-block; margin: 10px; padding: 10px; background: #f8f9fa; border-radius: 4px; }
        .chart-container { margin: 20px 0; }
    </style>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.min.js"></script>
</head>
<body>
    <div class="container">
        <h1>🚀 Matching Algorithm Benchmark Report</h1>
        <p>Generated on: ${new Date().toLocaleString()}</p>
        
        <div class="summary">
            <h2>📊 System Information</h2>
            <div class="metric">Total Memory: ${(results.systemInfo.totalMemory / 1024 / 1024 / 1024).toFixed(2)} GB</div>
            <div class="metric">Free Memory: ${(results.systemInfo.freeMemory / 1024 / 1024 / 1024).toFixed(2)} GB</div>
            <div class="metric">CPU Cores: ${results.systemInfo.cpuCount}</div>
        </div>

        <h2>📈 Performance Results</h2>
        <table>
            <thead>
                <tr>
                    <th>Algorithm</th>
                    <th>Data Size</th>
                    <th>Execution Time (ms)</th>
                    <th>Memory Usage (MB)</th>
                    <th>CPU Usage (%)</th>
                    <th>Accuracy (%)</th>
                    <th>Throughput (rec/sec)</th>
                </tr>
            </thead>
            <tbody>
                ${results.results.map((result: any) => `
                    <tr>
                        <td>${result.algorithmName}</td>
                        <td>${result.dataSize}</td>
                        <td>${result.executionTime.toFixed(2)}</td>
                        <td>${(result.memoryUsage / 1024 / 1024).toFixed(2)}</td>
                        <td>${result.cpuUsage.toFixed(2)}</td>
                        <td>${result.accuracy.toFixed(2)}</td>
                        <td>${result.throughput.toFixed(2)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>

        <div class="recommendations">
            <h2>🏆 Recommendations</h2>
            <ul>
                ${results.summary.recommendations.map((rec: string) => `<li>${rec}</li>`).join('')}
            </ul>
        </div>

        <div class="chart-container">
            <canvas id="performanceChart" width="400" height="200"></canvas>
        </div>

        <script>
            const ctx = document.getElementById('performanceChart').getContext('2d');
            const chart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: [${results.results.map((r: any) => r.dataSize).filter((v: any, i: any, a: any) => a.indexOf(v) === i).join(',')}],
                    datasets: [
                        ${Object.keys(results.summary.algorithmStats).map((alg: string) => `{
                            label: '${alg}',
                            data: [${results.results.filter((r: any) => r.algorithmName === alg).map((r: any) => r.executionTime).join(',')}],
                            borderColor: '#' + Math.floor(Math.random()*16777215).toString(16),
                            tension: 0.1
                        }`).join(',')}
                    ]
                },
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Execution Time vs Data Size'
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Execution Time (ms)'
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: 'Data Size'
                            }
                        }
                    }
                }
            });
        </script>
    </div>
</body>
</html>`;
}

function compareResults(results1: any, results2: any): void {
  console.log('\nFile 1 vs File 2 Performance Comparison:\n');
  
  const algorithms1 = Object.keys(results1.summary.algorithmStats);
  const algorithms2 = Object.keys(results2.summary.algorithmStats);
  
  const commonAlgorithms = algorithms1.filter(alg => algorithms2.includes(alg));
  
  for (const algorithm of commonAlgorithms) {
    const stats1 = results1.summary.algorithmStats[algorithm];
    const stats2 = results2.summary.algorithmStats[algorithm];
    
    console.log(`${algorithm}:`);
    console.log(`  Execution Time: ${stats1.avgExecutionTime.toFixed(2)}ms → ${stats2.avgExecutionTime.toFixed(2)}ms (${getChangeIndicator(stats1.avgExecutionTime, stats2.avgExecutionTime, false)})`);
    console.log(`  Memory Usage: ${(stats1.avgMemoryUsage/1024/1024).toFixed(2)}MB → ${(stats2.avgMemoryUsage/1024/1024).toFixed(2)}MB (${getChangeIndicator(stats1.avgMemoryUsage, stats2.avgMemoryUsage, false)})`);
    console.log(`  Accuracy: ${stats1.avgAccuracy.toFixed(2)}% → ${stats2.avgAccuracy.toFixed(2)}% (${getChangeIndicator(stats1.avgAccuracy, stats2.avgAccuracy, true)})`);
    console.log(`  Throughput: ${stats1.avgThroughput.toFixed(2)} → ${stats2.avgThroughput.toFixed(2)} rec/sec (${getChangeIndicator(stats1.avgThroughput, stats2.avgThroughput, true)})`);
    console.log('');
  }
}

function getChangeIndicator(oldValue: number, newValue: number, higherIsBetter: boolean): string {
  const change = ((newValue - oldValue) / oldValue) * 100;
  const isImprovement = higherIsBetter ? change > 0 : change < 0;
  const symbol = isImprovement ? '✅' : '❌';
  const direction = change > 0 ? '+' : '';
  return `${symbol} ${direction}${change.toFixed(1)}%`;
}

// Export CLI function for package.json script
if (require.main === module) {
  runBenchmarkCLI().catch(console.error);
}
