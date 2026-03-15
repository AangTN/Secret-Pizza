import React, { useEffect, useMemo, useState } from 'react';
import { 
  fetchOrders,
  fetchDashboardOverview,
  fetchBestSellingProducts,
  fetchBestSellingCombos,
  fetchOrdersByStatus,
  fetchOrdersByPaymentMethod,
  fetchOrderCountByPeriod,
  fetchRevenueByBranch,
  fetchRevenueComparisonByBranch,
} from '../../services/api';
import { BarChart, LineChart, PieChart, AreaChart } from '../../components/admin/Charts';
import ReviewAnalytics from './ReviewAnalytics';
import styles from '../../styles/admin/AdminCard.module.css';
import '../../styles/admin.css';

const AdminDashboard = () => {
  const [orders, setOrders] = useState([]);
  const [overview, setOverview] = useState(null);
  const [bestProducts, setBestProducts] = useState([]);
  const [bestCombos, setBestCombos] = useState([]);
  const [statusStats, setStatusStats] = useState([]);
  const [paymentStats, setPaymentStats] = useState([]);
  const [branchRevenue, setBranchRevenue] = useState([]);
  const [branchComparisonData, setBranchComparisonData] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [timeRange, setTimeRange] = useState('week'); // 'week', 'month', 'year'
  const [comparisonTimeRange, setComparisonTimeRange] = useState('week'); // 'week', 'month', 'year'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [
          ordersRes,
          overviewRes,
          productsRes,
          combosRes,
          statusRes,
          paymentRes,
          branchRes,
        ] = await Promise.all([
          fetchOrders().catch(() => ({ data: [] })),
          fetchDashboardOverview().catch(() => ({ data: null })),
          fetchBestSellingProducts({ limit: 5 }).catch(() => ({ data: [] })),
          fetchBestSellingCombos({ limit: 5 }).catch(() => ({ data: [] })),
          fetchOrdersByStatus().catch(() => ({ data: [] })),
          fetchOrdersByPaymentMethod().catch(() => ({ data: [] })),
          fetchRevenueByBranch().catch(() => ({ data: [] })),
        ]);

        if (!mounted) return;
        
        setOrders(Array.isArray(ordersRes?.data) ? ordersRes.data : []);
        setOverview(overviewRes?.data || null);
        setBestProducts(Array.isArray(productsRes?.data) ? productsRes.data : []);
        setBestCombos(Array.isArray(combosRes?.data) ? combosRes.data : []);
        setStatusStats(Array.isArray(statusRes?.data) ? statusRes.data : []);
        setPaymentStats(Array.isArray(paymentRes?.data) ? paymentRes.data : []);
        setBranchRevenue(Array.isArray(branchRes?.data) ? branchRes.data : []);
      } catch (err) {
        if (!mounted) return;
        setError(err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Fetch chart data based on time range
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const now = new Date();
        let startDate, endDate, groupBy;
        
        // Sử dụng ngày địa phương
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        endDate = `${year}-${month}-${day}`;
        
        if (timeRange === 'week') {
          const weekAgo = new Date(now);
          weekAgo.setDate(now.getDate() - 6); // 7 ngày bao gồm hôm nay
          const sy = weekAgo.getFullYear();
          const sm = String(weekAgo.getMonth() + 1).padStart(2, '0');
          const sd = String(weekAgo.getDate()).padStart(2, '0');
          startDate = `${sy}-${sm}-${sd}`;
          groupBy = 'day';
        } else if (timeRange === 'month') {
          const monthAgo = new Date(now);
          monthAgo.setDate(now.getDate() - 29); // 30 ngày bao gồm hôm nay
          const my = monthAgo.getFullYear();
          const mm = String(monthAgo.getMonth() + 1).padStart(2, '0');
          const md = String(monthAgo.getDate()).padStart(2, '0');
          startDate = `${my}-${mm}-${md}`;
          groupBy = 'day';
        } else if (timeRange === 'year') {
          const yearAgo = new Date(now);
          yearAgo.setMonth(now.getMonth() - 11); // 12 tháng bao gồm tháng này
          const yy = yearAgo.getFullYear();
          const ym = String(yearAgo.getMonth() + 1).padStart(2, '0');
          const yd = String(yearAgo.getDate()).padStart(2, '0');
          startDate = `${yy}-${ym}-${yd}`;
          groupBy = 'month';
        }

        const res = await fetchOrderCountByPeriod({
          groupBy,
          startDate,
          endDate
        });

        if (!mounted) return;

        const data = Array.isArray(res?.data) ? res.data : [];
        
        // Tạo danh sách đầy đủ các ngày/tháng
        const allPeriods = [];
        if (groupBy === 'day') {
          const start = new Date(startDate);
          const end = new Date(endDate);
          const current = new Date(start);
          while (current <= end) {
            allPeriods.push(current.toISOString().split('T')[0]);
            current.setDate(current.getDate() + 1);
          }
        } else if (groupBy === 'month') {
          const start = new Date(startDate);
          const end = new Date(endDate);
          const current = new Date(start);
          while (current <= end) {
            const year = current.getFullYear();
            const month = String(current.getMonth() + 1).padStart(2, '0');
            allPeriods.push(`${year}-${month}`);
            current.setMonth(current.getMonth() + 1);
          }
        }

        // Map data với tất cả các khoảng thời gian
        const dataMap = {};
        data.forEach(item => {
          dataMap[item.period] = item;
        });

        const formattedData = allPeriods.map(period => {
          const item = dataMap[period] || { period, count: 0, totalRevenue: 0 };
          let label;
          if (groupBy === 'day') {
            label = new Date(period).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
          } else if (groupBy === 'month') {
            const [year, month] = period.split('-');
            label = `${month}/${year}`;
          }
          return {
            period: label,
            'Số đơn': item.count,
            'Doanh thu (VNĐ)': Math.round(item.totalRevenue)
          };
        });
        
        setChartData(formattedData);
      } catch (err) {
        console.error('Error fetching chart data:', err);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [timeRange]);

  // Fetch branch comparison data based on time range
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const now = new Date();
        let startDate, endDate, groupBy;
        
        // Sử dụng ngày địa phương
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        endDate = `${year}-${month}-${day}`;
        
        if (comparisonTimeRange === 'week') {
          const weekAgo = new Date(now);
          weekAgo.setDate(now.getDate() - 6);
          const sy = weekAgo.getFullYear();
          const sm = String(weekAgo.getMonth() + 1).padStart(2, '0');
          const sd = String(weekAgo.getDate()).padStart(2, '0');
          startDate = `${sy}-${sm}-${sd}`;
          groupBy = 'day';
        } else if (comparisonTimeRange === 'month') {
          const monthAgo = new Date(now);
          monthAgo.setDate(now.getDate() - 29);
          const my = monthAgo.getFullYear();
          const mm = String(monthAgo.getMonth() + 1).padStart(2, '0');
          const md = String(monthAgo.getDate()).padStart(2, '0');
          startDate = `${my}-${mm}-${md}`;
          groupBy = 'day';
        } else if (comparisonTimeRange === 'year') {
          const yearAgo = new Date(now);
          yearAgo.setMonth(now.getMonth() - 11);
          const yy = yearAgo.getFullYear();
          const ym = String(yearAgo.getMonth() + 1).padStart(2, '0');
          const yd = String(yearAgo.getDate()).padStart(2, '0');
          startDate = `${yy}-${ym}-${yd}`;
          groupBy = 'month';
        }

        const res = await fetchRevenueComparisonByBranch({
          groupBy,
          startDate,
          endDate
        });

        if (!mounted) return;

        const data = Array.isArray(res?.data) ? res.data : [];
        
        // Tạo danh sách đầy đủ các ngày/tháng
        const allPeriods = [];
        if (groupBy === 'day') {
          const start = new Date(startDate);
          const end = new Date(endDate);
          const current = new Date(start);
          while (current <= end) {
            allPeriods.push(current.toISOString().split('T')[0]);
            current.setDate(current.getDate() + 1);
          }
        } else if (groupBy === 'month') {
          const start = new Date(startDate);
          const end = new Date(endDate);
          const current = new Date(start);
          while (current <= end) {
            const year = current.getFullYear();
            const month = String(current.getMonth() + 1).padStart(2, '0');
            allPeriods.push(`${year}-${month}`);
            current.setMonth(current.getMonth() + 1);
          }
        }

        // Lấy danh sách tất cả các cơ sở từ data
        const branchNames = new Set();
        data.forEach(item => {
          Object.keys(item).forEach(key => {
            if (key !== 'period' && !key.endsWith('_orders')) {
              branchNames.add(key);
            }
          });
        });

        // Map data với tất cả các khoảng thời gian
        const dataMap = {};
        data.forEach(item => {
          dataMap[item.period] = item;
        });

        const formattedData = allPeriods.map(period => {
          const item = dataMap[period] || { period };
          let label;
          if (groupBy === 'day') {
            label = new Date(period).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
          } else if (groupBy === 'month') {
            const [year, month] = period.split('-');
            label = `${month}/${year}`;
          }
          
          const result = { period: label };
          branchNames.forEach(branchName => {
            result[branchName] = Math.round(item[branchName] || 0);
          });
          
          return result;
        });
        
        setBranchComparisonData(formattedData);
      } catch (err) {
        console.error('Error fetching branch comparison data:', err);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [comparisonTimeRange]);

  const getLatestStatus = (order) => {
    const history = Array.isArray(order?.LichSuTrangThaiDonHang)
      ? order.LichSuTrangThaiDonHang
      : [];
    if (history.length === 0) return 'Không rõ';
    const sorted = [...history].sort(
      (a, b) => new Date(b.ThoiGianCapNhat) - new Date(a.ThoiGianCapNhat)
    );
    return sorted[0]?.TrangThai || 'Không rõ';
  };

  const parseAmount = (value) => {
    if (value === null || value === undefined) return 0;
    const numeric = Number(String(value).replace(/[^0-9.-]/g, ''));
    return Number.isFinite(numeric) ? numeric : 0;
  };

  const metrics = useMemo(() => {
    if (!orders.length) {
      return {
        totalOrders: 0,
        totalRevenue: 0,
        avgOrderValue: 0,
        totalDiscount: 0,
        totalShipping: 0,
        pendingConfirmation: 0,
        inDelivery: 0,
        completed: 0,
        statusBreakdown: [],
        paymentStatusBreakdown: [],
        paymentMethodTotals: [],
      };
    }

    let totalRevenue = 0;
    let totalDiscount = 0;
    let totalShipping = 0;
    let pendingConfirmation = 0;
    let inDelivery = 0;
    let completed = 0;

    const statusMap = new Map();
    const paymentStatusMap = new Map();
    const paymentMethodMap = new Map();

    orders.forEach((order) => {
      totalRevenue += parseAmount(order.TongTien);
      totalDiscount += parseAmount(order.TienGiamGia);
      totalShipping += parseAmount(order.PhiShip);

      const status = getLatestStatus(order);
      statusMap.set(status, (statusMap.get(status) || 0) + 1);

      if (status === 'Đang chờ xác nhận') pendingConfirmation += 1;
      else if (status === 'Đang giao' || status === 'Đang xử lý') inDelivery += 1;
      else if (status === 'Đã giao') completed += 1;

      const payments = Array.isArray(order?.ThanhToan) ? order.ThanhToan : [];
      payments.forEach((payment) => {
        const paymentStatus = payment?.TrangThai || 'Không rõ';
        const paymentMethod = payment?.PhuongThuc || 'Khác';
        paymentStatusMap.set(
          paymentStatus,
          (paymentStatusMap.get(paymentStatus) || 0) + 1
        );
        paymentMethodMap.set(
          paymentMethod,
          (paymentMethodMap.get(paymentMethod) || 0) + parseAmount(payment?.SoTien)
        );
      });
    });

    return {
      totalOrders: orders.length,
      totalRevenue,
      avgOrderValue: orders.length ? totalRevenue / orders.length : 0,
      totalDiscount,
      totalShipping,
      pendingConfirmation,
      inDelivery,
      completed,
      statusBreakdown: Array.from(statusMap.entries()).map(([status, count]) => ({
        status,
        count,
      })),
      paymentStatusBreakdown: Array.from(paymentStatusMap.entries()).map(
        ([status, count]) => ({ status, count })
      ),
      paymentMethodTotals: Array.from(paymentMethodMap.entries()).map(
        ([method, amount]) => ({ method, amount })
      ),
    };
  }, [orders]);

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0,
    }).format(Math.round(amount));

  const formatDateTime = (value) => {
    if (!value) return 'Không rõ';
    try {
      return new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(value));
    } catch (err) {
      return 'Không rõ';
    }
  };

  const recentOrders = useMemo(() => {
    return [...orders]
      .sort((a, b) => new Date(b.NgayDat) - new Date(a.NgayDat))
      .slice(0, 6);
  }, [orders]);

  // Sử dụng dữ liệu từ API overview nếu có, fallback về metrics cũ
  const statCards = [
    {
      key: 'today',
      title: 'Hôm nay',
      value: overview?.homNay?.soDonHang || 0,
      description: formatCurrency(parseAmount(overview?.homNay?.doanhThu) || 0),
      icon: '📅',
      tone: styles.cardStatIconPrimary,
      accent: 'var(--admin-primary)',
    },
    {
      key: 'week',
      title: 'Tuần này',
      value: overview?.tuanNay?.soDonHang || 0,
      description: formatCurrency(parseAmount(overview?.tuanNay?.doanhThu) || 0),
      icon: '📊',
      tone: styles.cardStatIconInfo,
      accent: 'var(--admin-info)',
    },
    {
      key: 'month',
      title: 'Tháng này',
      value: overview?.thangNay?.soDonHang || 0,
      description: formatCurrency(parseAmount(overview?.thangNay?.doanhThu) || 0),
      icon: '📈',
      tone: styles.cardStatIconSuccess,
      accent: 'var(--admin-success)',
    },
    {
      key: 'total',
      title: 'Tổng cộng',
      value: overview?.tongQuan?.tongSoDonHang || metrics.totalOrders,
      description: formatCurrency(parseAmount(overview?.tongQuan?.tongDoanhThu) || metrics.totalRevenue),
      icon: '💰',
      tone: styles.cardStatIconWarning,
      accent: 'var(--admin-warning)',
    },
  ];

  return (
    <div className="admin-animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--admin-space-xl)' }}>
      <div
        className={`${styles.cardGradient}`}
        style={{ padding: 'var(--admin-space-xl)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: 'var(--admin-font-size-3xl)', fontWeight: 'var(--admin-font-weight-extrabold)', color: 'var(--admin-text-primary)' }}>
            Tổng quan đơn hàng
          </h2>
          <p style={{ marginTop: 'var(--admin-space-sm)', color: 'var(--admin-text-secondary)' }}>
            Báo cáo tổng hợp từ toàn bộ cơ sở
          </p>
        </div>
        {loading && (
          <span style={{ padding: 'var(--admin-space-sm) var(--admin-space-md)', background: 'var(--admin-primary)', color: 'var(--admin-white)', borderRadius: 'var(--admin-radius-lg)', fontSize: 'var(--admin-font-size-sm)', boxShadow: 'var(--admin-shadow-sm)' }}>
            Đang tải dữ liệu...
          </span>
        )}
      </div>

      {error && (
        <div className={`${styles.card} ${styles.cardAnimateIn}`} style={{ borderColor: 'var(--admin-danger)' }}>
          <div className={styles.cardBody}>
            <strong style={{ color: 'var(--admin-danger)' }}>Không thể tải dữ liệu đơn hàng.</strong>
            <p style={{ marginTop: 'var(--admin-space-sm)', color: 'var(--admin-text-secondary)' }}>
              Vui lòng kiểm tra lại kết nối hoặc thử tải lại trang.
            </p>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--admin-space-lg)' }}>
        {statCards.map((card, index) => (
          <div
            key={card.key}
            className={`${styles.cardPremium} ${styles.cardAnimateIn}`}
            style={{ animationDelay: `${index * 0.08}s`, borderLeft: `4px solid ${card.accent}` }}
          >
            <div className={styles.cardBody}>
              <div className={styles.cardStats}>
                <div>
                  <div className={styles.cardStatLabel}>{card.title}</div>
                  <div className={styles.cardStatValue}>{card.value}</div>
                  <div style={{ marginTop: 'var(--admin-space-xs)', color: 'var(--admin-text-secondary)', fontSize: 'var(--admin-font-size-xs)' }}>
                    {card.description}
                  </div>
                </div>
                <div className={`${styles.cardStatIcon} ${card.tone}`}>
                  {card.icon}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--admin-space-lg)' }}>
        <div className={`${styles.card} ${styles.cardAnimateIn}`}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>📈 Doanh thu theo thời gian</h3>
            <p className={styles.cardSubtitle}>Xu hướng doanh thu và đơn hàng</p>
          </div>
          <div className={styles.cardBody}>
            <div style={{ display: 'flex', gap: 'var(--admin-space-md)', marginBottom: 'var(--admin-space-lg)' }}>
              <button
                onClick={() => setTimeRange('week')}
                style={{
                  padding: 'var(--admin-space-sm) var(--admin-space-md)',
                  background: timeRange === 'week' ? 'var(--admin-primary)' : 'var(--admin-bg-secondary)',
                  color: timeRange === 'week' ? 'var(--admin-white)' : 'var(--admin-text-primary)',
                  border: '1px solid var(--admin-border-light)',
                  borderRadius: 'var(--admin-radius-md)',
                  cursor: 'pointer',
                  fontWeight: 'var(--admin-font-weight-medium)',
                  fontSize: 'var(--admin-font-size-sm)',
                  transition: 'var(--admin-transition-base)',
                }}
              >
                7 ngày
              </button>
              <button
                onClick={() => setTimeRange('month')}
                style={{
                  padding: 'var(--admin-space-sm) var(--admin-space-md)',
                  background: timeRange === 'month' ? 'var(--admin-primary)' : 'var(--admin-bg-secondary)',
                  color: timeRange === 'month' ? 'var(--admin-white)' : 'var(--admin-text-primary)',
                  border: '1px solid var(--admin-border-light)',
                  borderRadius: 'var(--admin-radius-md)',
                  cursor: 'pointer',
                  fontWeight: 'var(--admin-font-weight-medium)',
                  fontSize: 'var(--admin-font-size-sm)',
                  transition: 'var(--admin-transition-base)',
                }}
              >
                30 ngày
              </button>
              <button
                onClick={() => setTimeRange('year')}
                style={{
                  padding: 'var(--admin-space-sm) var(--admin-space-md)',
                  background: timeRange === 'year' ? 'var(--admin-primary)' : 'var(--admin-bg-secondary)',
                  color: timeRange === 'year' ? 'var(--admin-white)' : 'var(--admin-text-primary)',
                  border: '1px solid var(--admin-border-light)',
                  borderRadius: 'var(--admin-radius-md)',
                  cursor: 'pointer',
                  fontWeight: 'var(--admin-font-weight-medium)',
                  fontSize: 'var(--admin-font-size-sm)',
                  transition: 'var(--admin-transition-base)',
                }}
              >
                12 tháng
              </button>
            </div>
            {chartData.length === 0 && !loading ? (
              <span style={{ color: 'var(--admin-text-secondary)' }}>Chưa có dữ liệu.</span>
            ) : (
              <AreaChart
                data={chartData}
                xKey="period"
                yKeys={['Số đơn', 'Doanh thu (VNĐ)']}
                colors={['#1890ff', '#52c41a']}
                height={350}
              />
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--admin-space-lg)' }}>
        <div className={`${styles.card} ${styles.cardAnimateIn}`}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>💳 Phương thức thanh toán</h3>
            <p className={styles.cardSubtitle}>Doanh thu theo phương thức</p>
          </div>
          <div className={styles.cardBody}>
            {paymentStats.length === 0 && !loading ? (
              <span style={{ color: 'var(--admin-text-secondary)' }}>Chưa có dữ liệu.</span>
            ) : (
              <BarChart
                data={paymentStats
                  .filter(item => item.PhuongThuc === 'Chuyển Khoản' || item.PhuongThuc === 'Tiền Mặt')
                  .map(item => ({
                    name: item.PhuongThuc,
                    'Tổng tiền (VNĐ)': Math.round(parseAmount(item.TongTien)),
                    'Số giao dịch': item.SoGiaoDich
                  }))}
                xKey="name"
                yKey="Tổng tiền (VNĐ)"
                color="#1890ff"
                height={300}
              />
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--admin-space-lg)' }}>
        <div className={`${styles.card} ${styles.cardAnimateIn}`}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>🏢 So sánh doanh thu giữa các cơ sở</h3>
            <p className={styles.cardSubtitle}>Xu hướng doanh thu theo thời gian của từng chi nhánh</p>
          </div>
          <div className={styles.cardBody}>
            <div style={{ display: 'flex', gap: 'var(--admin-space-md)', marginBottom: 'var(--admin-space-lg)' }}>
              <button
                onClick={() => setComparisonTimeRange('week')}
                style={{
                  padding: 'var(--admin-space-sm) var(--admin-space-md)',
                  background: comparisonTimeRange === 'week' ? 'var(--admin-primary)' : 'var(--admin-bg-secondary)',
                  color: comparisonTimeRange === 'week' ? 'var(--admin-white)' : 'var(--admin-text-primary)',
                  border: '1px solid var(--admin-border-light)',
                  borderRadius: 'var(--admin-radius-md)',
                  cursor: 'pointer',
                  fontWeight: 'var(--admin-font-weight-medium)',
                  fontSize: 'var(--admin-font-size-sm)',
                  transition: 'var(--admin-transition-base)',
                }}
              >
                7 ngày
              </button>
              <button
                onClick={() => setComparisonTimeRange('month')}
                style={{
                  padding: 'var(--admin-space-sm) var(--admin-space-md)',
                  background: comparisonTimeRange === 'month' ? 'var(--admin-primary)' : 'var(--admin-bg-secondary)',
                  color: comparisonTimeRange === 'month' ? 'var(--admin-white)' : 'var(--admin-text-primary)',
                  border: '1px solid var(--admin-border-light)',
                  borderRadius: 'var(--admin-radius-md)',
                  cursor: 'pointer',
                  fontWeight: 'var(--admin-font-weight-medium)',
                  fontSize: 'var(--admin-font-size-sm)',
                  transition: 'var(--admin-transition-base)',
                }}
              >
                30 ngày
              </button>
              <button
                onClick={() => setComparisonTimeRange('year')}
                style={{
                  padding: 'var(--admin-space-sm) var(--admin-space-md)',
                  background: comparisonTimeRange === 'year' ? 'var(--admin-primary)' : 'var(--admin-bg-secondary)',
                  color: comparisonTimeRange === 'year' ? 'var(--admin-white)' : 'var(--admin-text-primary)',
                  border: '1px solid var(--admin-border-light)',
                  borderRadius: 'var(--admin-radius-md)',
                  cursor: 'pointer',
                  fontWeight: 'var(--admin-font-weight-medium)',
                  fontSize: 'var(--admin-font-size-sm)',
                  transition: 'var(--admin-transition-base)',
                }}
              >
                12 tháng
              </button>
            </div>
            {branchComparisonData.length === 0 && !loading ? (
              <span style={{ color: 'var(--admin-text-secondary)' }}>Chưa có dữ liệu.</span>
            ) : (
              <LineChart
                data={branchComparisonData}
                xKey="period"
                yKeys={branchComparisonData.length > 0 ? Object.keys(branchComparisonData[0]).filter(k => k !== 'period') : []}
                colors={['#722ed1', '#13c2c2', '#52c41a', '#faad14']}
                height={350}
              />
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--admin-space-lg)' }}>
        <div className={`${styles.card} ${styles.cardAnimateIn}`}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>🏆 Top 5 Sản phẩm bán chạy</h3>
            <p className={styles.cardSubtitle}>Sản phẩm có doanh thu cao nhất</p>
          </div>
          <div className={styles.cardBody} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--admin-space-md)' }}>
            {bestProducts.length === 0 && !loading ? (
              <span style={{ color: 'var(--admin-text-secondary)' }}>Chưa có dữ liệu.</span>
            ) : (
              bestProducts.map((item, index) => (
                <div key={item.MaBienThe} style={{ display: 'flex', alignItems: 'center', gap: 'var(--admin-space-md)', padding: 'var(--admin-space-sm)', background: 'var(--admin-bg-secondary)', borderRadius: 'var(--admin-radius-md)' }}>
                  <span style={{ fontSize: 'var(--admin-font-size-xl)', fontWeight: 'var(--admin-font-weight-bold)', color: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : 'var(--admin-text-tertiary)', minWidth: '30px' }}>
                    #{index + 1}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 'var(--admin-font-weight-semibold)', color: 'var(--admin-text-primary)' }}>
                      {item.ThongTinSanPham?.MonAn?.TenMonAn || 'N/A'} 
                      {item.ThongTinSanPham?.Size?.TenSize && ` (${item.ThongTinSanPham.Size.TenSize})`}
                    </div>
                    <div style={{ fontSize: 'var(--admin-font-size-xs)', color: 'var(--admin-text-secondary)' }}>
                      {item.TongSoLuongBan} đã bán • {item.SoDonHang} đơn hàng
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 'var(--admin-font-weight-bold)', color: 'var(--admin-success)' }}>
                      {formatCurrency(parseAmount(item.TongDoanhThu))}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className={`${styles.card} ${styles.cardAnimateIn}`}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>🎁 Top 5 Combo bán chạy</h3>
            <p className={styles.cardSubtitle}>Combo được yêu thích nhất</p>
          </div>
          <div className={styles.cardBody} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--admin-space-md)' }}>
            {bestCombos.length === 0 && !loading ? (
              <span style={{ color: 'var(--admin-text-secondary)' }}>Chưa có dữ liệu.</span>
            ) : (
              bestCombos.map((item, index) => (
                <div key={item.MaCombo} style={{ display: 'flex', alignItems: 'center', gap: 'var(--admin-space-md)', padding: 'var(--admin-space-sm)', background: 'var(--admin-bg-secondary)', borderRadius: 'var(--admin-radius-md)' }}>
                  <span style={{ fontSize: 'var(--admin-font-size-xl)', fontWeight: 'var(--admin-font-weight-bold)', color: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : 'var(--admin-text-tertiary)', minWidth: '30px' }}>
                    #{index + 1}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 'var(--admin-font-weight-semibold)', color: 'var(--admin-text-primary)' }}>
                      {item.ThongTinCombo?.TenCombo || 'N/A'}
                    </div>
                    <div style={{ fontSize: 'var(--admin-font-size-xs)', color: 'var(--admin-text-secondary)' }}>
                      {item.TongSoLuongBan} đã bán • {item.SoDonHang} đơn hàng
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 'var(--admin-font-weight-bold)', color: 'var(--admin-success)' }}>
                      {formatCurrency(parseAmount(item.TongDoanhThu))}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Review Analytics Section */}
      <div className="mt-4">
        <ReviewAnalytics />
      </div>
    </div>
  );
};

export default AdminDashboard;
