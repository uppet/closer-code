#!/usr/bin/env node
/**
 * ASCII 茶杯绘制命令行程序
 * 支持多种风格和交互式选择
 */

import readline from 'readline';

// 茶杯样式库
const cupStyles = {
  classic: {
    name: '经典茶杯',
    art: `
        .::::::::::.
      .:::::::::::::.
     :::::::::::::::::
    ::::::::::::::::::
    ::::::::::::::::::
     :::::::::::::::::
      :::::::::::::::
        ':::::::::'
           ':'
    `
  },
  
  elegant: {
    name: '优雅茶杯',
    art: `
          _____
         /     \\
        |       |
        |       |
         \\_____/
          \\___/
           | |
         __|_|__
        /       \\
       |_________|
    `
  },
  
  steaming: {
    name: '热气腾腾',
    art: `
          )  (
         (   )
        [_____]
         \\___/
    `
  },
  
  english: {
    name: '英式下午茶',
    art: `
           )
          ( )
         [___]
          \\_/
    `
  },
  
  coffee: {
    name: '咖啡杯',
    art: `
         ______
        |      |
        |  ~~  |
        |______|
         \\    /
          \\  /
           \\/
    `
  },
  
  teapot: {
    name: '茶壶',
    art: `
          ___.-----._
         /.___.-----. \\
        |   _     _   |
        |  (o)   (o)  |
        |      <      |
         \\     __    /
          '._(  )_.'
             '-'
    `
  },
  
  heart: {
    name: '爱心茶杯',
    art: `
         ______
        |  ~~  |
        |  <3  |
        |______|
         \\    /
          \\  /
           \\/
    `
  }
};

// 显示菜单
function showMenu() {
  console.log('\n╔════════════════════════════════╗');
  console.log('║   🍵 ASCII 茶杯绘制程序         ║');
  console.log('╚════════════════════════════════╝\n');
  
  const styles = Object.entries(cupStyles);
  styles.forEach(([key, value], index) => {
    console.log(`  ${index + 1}. ${value.name}`);
  });
  
  console.log(`  ${styles.length + 1}. 显示所有样式`);
  console.log(`  0. 退出\n`);
}

// 绘制选定的茶杯
function drawCup(styleKey) {
  const cup = cupStyles[styleKey];
  if (cup) {
    console.log(`\n  【${cup.name}】\n`);
    console.log(cup.art);
    console.log('');
  }
}

// 显示所有茶杯
function showAllCups() {
  console.log('\n╔════════════════════════════════╗');
  console.log('║       🍵 茶杯样式展示           ║');
  console.log('╚════════════════════════════════╝\n');
  
  Object.entries(cupStyles).forEach(([key, cup]) => {
    console.log(`  ┌─ ${cup.name} ─────────────────┐`);
    console.log(cup.art);
    console.log('  └────────────────────────────┘\n');
  });
}

// 主交互循环
async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const styles = Object.keys(cupStyles);
  
  while (true) {
    showMenu();
    
    const choice = await new Promise(resolve => {
      rl.question('  请选择茶杯样式 (输入数字): ', resolve);
    });

    const num = parseInt(choice.trim());
    
    if (num === 0) {
      console.log('\n  👋 再见！感谢使用！\n');
      rl.close();
      break;
    } else if (num === styles.length + 1) {
      showAllCups();
    } else if (num >= 1 && num <= styles.length) {
      drawCup(styles[num - 1]);
    } else {
      console.log('\n  ❌ 无效选择，请重新输入\n');
    }
    
    // 等待用户按回车继续
    if (num !== 0) {
      await new Promise(resolve => {
        rl.question('  按回车键继续...', resolve);
      });
    }
  }
}

// 直接运行模式（命令行参数）
function directRun(style) {
  if (style === 'all') {
    showAllCups();
  } else if (cupStyles[style]) {
    drawCup(style);
  } else {
    console.log('\n  ❌ 未知的茶杯样式\n');
    console.log('  可用样式:', Object.keys(cupStyles).join(', '));
    console.log('  使用 "node ascii-teacup.mjs all" 查看所有样式\n');
  }
}

// 程序入口
if (process.argv.length > 2) {
  const style = process.argv[2];
  directRun(style);
} else {
  main();
}
