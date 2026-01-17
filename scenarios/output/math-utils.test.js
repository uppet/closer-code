
// 数学工具库测试套件
import assert from 'assert';

describe('MathUtils', () => {
  describe('add', () => {
    it('应该正确相加两个正数', () => {
      assert.strictEqual(add(2, 3), 5);
    
  describe('subtract', () => {
    it('应该正确相减两个正数', () => {
      assert.strictEqual(subtract(5, 3), 2);
    
  describe('subtract', () => {
    it('应该正确相减两个正数', () => {
      assert.strictEqual(subtract(5, 3), 2);
    });

    it('应该正确处理负数', () => {
      assert.strictEqual(subtract(-2, 3), -5);
    });
  });

  describe('divide', () => {
    it('应该正确相除两个正数', () => {
      assert.strictEqual(divide(6, 3), 2);
    });

    it('应该抛出除零错误', () => {
      assert.throws(() => divide(5, 0), /Division by zero/);
    });
  });
});

    it('应该正确处理负数', () => {
      assert.strictEqual(subtract(-2, 3), -5);
    });
  });

  describe('divide', () => {
    it('应该正确相除两个正数', () => {
      assert.strictEqual(divide(6, 3), 2);
    });

    it('应该抛出除零错误', () => {
      assert.throws(() => divide(5, 0), /Division by zero/);
    });
  });
});

    it('应该正确处理负数', () => {
      assert.strictEqual(add(-2, 3), 1);
      assert.strictEqual(add(-2, -3), -5);
    });

    it('应该正确处理零', () => {
      assert.strictEqual(add(0, 5), 5);
      assert.strictEqual(add(0, 0), 0);
    });

    it('应该正确处理小数', () => {
      assert.strictEqual(add(0.1, 0.2), 0.3);
    });
  });

  describe('multiply', () => {
    it('应该正确相乘两个正数', () => {
      assert.strictEqual(multiply(2, 3), 6);
    });

    it('应该正确处理负数', () => {
      assert.strictEqual(multiply(-2, 3), -6);
      assert.strictEqual(multiply(-2, -3), 6);
    });

    it('应该正确处理零', () => {
      assert.strictEqual(multiply(0, 5), 0);
    });
  });
});

// 导入被测试的模块
import { add, multiply, subtract, divide } from './math-utils.js';

// 数学工具库测试套件
import assert from 'assert';

describe('MathUtils', () => {
  describe('add', () => {
    it('应该正确相加两个正数', () => {
      assert.strictEqual(add(2, 3), 5);
    });

    it('应该正确处理负数', () => {
      assert.strictEqual(add(-2, 3), 1);
      assert.strictEqual(add(-2, -3), -5);
    });

    it('应该正确处理零', () => {
      assert.strictEqual(add(0, 5), 5);
      assert.strictEqual(add(0, 0), 0);
    });

    it('应该正确处理小数', () => {
      assert.strictEqual(add(0.1, 0.2), 0.3);
    });
  });

  describe('multiply', () => {
    it('应该正确相乘两个正数', () => {
      assert.strictEqual(multiply(2, 3), 6);
    });

    it('应该正确处理负数', () => {
      assert.strictEqual(multiply(-2, 3), -6);
      assert.strictEqual(multiply(-2, -3), 6);
    });

    it('应该正确处理零', () => {
      assert.strictEqual(multiply(0, 5), 0);
    });
  });
});

// 导入被测试的模块
import { add, multiply, subtract, divide } from './math-utils.js';

// 数学工具库测试套件
import assert from 'assert';

describe('MathUtils', () => {
  describe('add', () => {
    it('应该正确相加两个正数', () => {
      assert.strictEqual(add(2, 3), 5);
    });

    it('应该正确处理负数', () => {
      assert.strictEqual(add(-2, 3), 1);
      assert.strictEqual(add(-2, -3), -5);
    });

    it('应该正确处理零', () => {
      assert.strictEqual(add(0, 5), 5);
      assert.strictEqual(add(0, 0), 0);
    });

    it('应该正确处理小数', () => {
      assert.strictEqual(add(0.1, 0.2), 0.3);
    });
  });

  describe('multiply', () => {
    it('应该正确相乘两个正数', () => {
      assert.strictEqual(multiply(2, 3), 6);
    });

    it('应该正确处理负数', () => {
      assert.strictEqual(multiply(-2, 3), -6);
      assert.strictEqual(multiply(-2, -3), 6);
    });

    it('应该正确处理零', () => {
      assert.strictEqual(multiply(0, 5), 0);
    });
  });
});
