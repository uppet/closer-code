/**
 * 版本更新检查命令
 */

import { getVersion } from '../utils/version.js';
import { showInfo, showSuccess, showTip } from '../utils/cli.js';

/**
 * 检查 npm 上的最新版本
 */
async function checkLatestVersion() {
  try {
    const https = await import('https');
    const packageJson = await import('../../package.json', { assert: { type: 'json' } });

    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'registry.npmjs.org',
        path: `/${packageJson.default.name}`,
        method: 'GET',
        headers: {
          'User-Agent': 'cloco'
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            const packageInfo = JSON.parse(data);
            resolve(packageInfo['dist-tags']?.latest || null);
          } catch (error) {
            reject(error);
          }
        });
      });

      req.on('error', reject);
      req.setTimeout(5000, () => {
        req.destroy();
        reject(new Error('请求超时'));
      });
      req.end();
    });
  } catch (error) {
    console.error('无法检查更新:', error.message);
    return null;
  }
}

/**
 * 比较版本号
 */
function compareVersions(current, latest) {
  const currentParts = current.split('.').map(Number);
  const latestParts = latest.split('.').map(Number);

  for (let i = 0; i < Math.max(currentParts.length, latestParts.length); i++) {
    const currentPart = currentParts[i] || 0;
    const latestPart = latestParts[i] || 0;

    if (currentPart < latestPart) return -1;
    if (currentPart > latestPart) return 1;
  }

  return 0;
}

/**
 * 升级命令主函数
 */
export default async function upgradeCommand(args, options) {
  showInfo('检查更新...');

  const currentVersion = getVersion();
  const latestVersion = await checkLatestVersion();

  if (!latestVersion) {
    showTip('无法获取最新版本信息');
    showInfo(`当前版本: ${currentVersion}`);
    return;
  }

  console.log(`✅ 当前版本: ${currentVersion}`);
  console.log(`📦 最新版本: ${latestVersion}`);

  const comparison = compareVersions(currentVersion, latestVersion);

  if (comparison < 0) {
    console.log('\n💡 有新版本可用！');
    showTip('运行以下命令更新:');
    console.log('   npm update -g closer-code');
    console.log('\n   或查看更新日志:');
    console.log(`   https://github.com/your-repo/closer-code/releases/tag/v${latestVersion}`);
  } else if (comparison === 0) {
    showSuccess('您正在使用最新版本！');
  } else {
    showInfo('您正在使用开发版本，比发布版本更新');
  }
}
