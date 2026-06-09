Component({
  properties: {
    total: { type: Number, value: 0 },
    current: { type: Number, value: 0 }
  },
  observers: {
    'total, current': function (total, current) {
      const dots = [];
      for (let i = 0; i < total; i++) {
        let cls = '';
        if (i < current) cls = 'done';
        else if (i === current) cls = 'active';
        dots.push({ cls });
      }
      this.setData({ dots });
    }
  }
});
